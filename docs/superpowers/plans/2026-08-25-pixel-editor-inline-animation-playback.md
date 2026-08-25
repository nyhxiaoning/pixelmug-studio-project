# Pixel Editor Inline Animation Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the popup animation preview with one-cycle playback inside the existing editor canvas and always restore frame one after natural completion or manual stop.

**Architecture:** Remove the dedicated preview canvas and popover. Add a playback-only renderer for `editorCanvasRef` plus a shared stop/reset function; the timer draws composite frames without mutating `currentFrameIndex`, waits for every frame delay including the last, then restores normal editor rendering on frame one.

**Tech Stack:** Vue 3 Composition API, Canvas 2D, browser timers, SCSS, Node.js `node:test`, Vite QA build

## Global Constraints

- Use the existing `editorCanvasRef`; do not add a canvas or overlay.
- Play exactly one cycle starting from frame index `0`.
- Do not change `currentFrameIndex` inside playback ticks.
- Natural completion and manual stop both select frame index `0`.
- Honor the last frame's delay before resetting.
- Block editor-canvas pointer interactions only while playback is active.
- Preserve frame delays, zoom dimensions, frame actions, layers, overview, persistence, import, and export behavior.

---

### Task 1: Move animation playback into the editor canvas

**Files:**
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue`
- Modify: `src/modules/pixel-editor/styles/index.scss`
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`

**Interfaces:**
- Consumes: `editorCanvasRef`, `compositeFrame(frame)`, `drawNonEmptyPixels`, `renderAll`, `centerOverviewOnViewport`, `previewPlaying`, and `previewTimer`.
- Produces: `renderPlaybackFrame(pixels: (string | null)[]): void` and `finishPreviewPlayback(): void`.

- [ ] **Step 1: Replace the popup-preview contract with a failing inline-playback contract**

Update the existing local-preview test to assert:

```ts
test('plays one animation cycle inside the editor canvas and restores frame one', () => {
  const editorCanvasTag = editorSource.match(/<canvas\s+[^>]*ref="editorCanvasRef"[^>]*>/)?.[0]
  const renderPlayback = extractBraceBlock(
    editorSource,
    'function renderPlaybackFrame(pixels: (string | null)[]): void'
  )
  const finishPlayback = extractBraceBlock(editorSource, 'function finishPreviewPlayback(): void')
  const togglePlayback = extractBraceBlock(editorSource, 'function handleTogglePreview(): void')
  const playbackCanvasStyle = extractCssBlock(
    editorStyles,
    '.pe-canvas-viewport canvas.is-preview-playing'
  )

  assert.ok(editorCanvasTag)
  assert.match(editorCanvasTag, /:class="\{ 'is-preview-playing': previewPlaying \}"/)
  assert.match(editorCanvasTag, /:aria-busy="previewPlaying"/)
  assert.doesNotMatch(editorSource, /pe-local-preview-popover|previewCanvasRef/)
  assert.doesNotMatch(editorStyles, /pe-local-preview-popover|pe-local-preview-close/)
  assert.match(renderPlayback, /const canvas = editorCanvasRef\.value/)
  assert.match(renderPlayback, /ctx\.clearRect\(0, 0, canvas\.width, canvas\.height\)/)
  assert.match(renderPlayback, /ctx\.fillStyle = '#05070b'/)
  assert.match(renderPlayback, /drawNonEmptyPixels\(ctx, pixels, WIDTH, HEIGHT\)/)
  assert.match(finishPlayback, /clearTimeout\(previewTimer\.value\)/)
  assert.match(finishPlayback, /previewTimer\.value = null/)
  assert.match(finishPlayback, /previewPlaying\.value = false/)
  assert.match(finishPlayback, /currentFrameIndex\.value = 0/)
  assert.match(finishPlayback, /activeLayer\.value = Math\.min/)
  assert.match(finishPlayback, /renderAll\(\)/)
  assert.match(finishPlayback, /nextTick\(centerOverviewOnViewport\)/)
  assert.match(togglePlayback, /if \(previewPlaying\.value\) \{\s*finishPreviewPlayback\(\)/)
  assert.match(togglePlayback, /let index = 0/)
  assert.match(togglePlayback, /renderPlaybackFrame\(compositeFrame\(project\.value\.frames\[index\]\)\)/)
  assert.doesNotMatch(togglePlayback, /currentFrameIndex\.value\s*=/)
  assert.match(togglePlayback, /previewTimer\.value = window\.setTimeout/)
  assert.match(togglePlayback, /finishPreviewPlayback\(\)/)
  assert.match(playbackCanvasStyle, /pointer-events:\s*none/)
})
```

- [ ] **Step 2: Run the targeted contract and verify RED**

```bash
node --test --test-name-pattern="animation cycle inside the editor canvas" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because the popup/ref still exist and the inline renderer/reset function do not.

- [ ] **Step 3: Remove the dedicated popup preview**

In the Vue template, delete the `v-if="previewPlaying"` `.pe-local-preview-popover` section. Remove `previewCanvasRef`, `renderPreview`, and all normal-render calls to `renderPreview`.

Delete `.pe-local-preview-popover`, `.pe-local-preview-close`, and `.pe-local-preview-popover canvas` SCSS blocks.

- [ ] **Step 4: Mark and lock the existing editor canvas during playback**

Add to `editorCanvasRef`:

```vue
:class="{ 'is-preview-playing': previewPlaying }"
:aria-busy="previewPlaying"
```

Add:

```scss
.pe-canvas-viewport canvas.is-preview-playing {
  pointer-events: none;
  cursor: progress;
}
```

- [ ] **Step 5: Add the playback renderer and shared reset path**

Implement:

```ts
function renderPlaybackFrame(pixels: (string | null)[]): void {
  const canvas = editorCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#05070b'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  drawNonEmptyPixels(ctx, pixels, WIDTH, HEIGHT)
}

function finishPreviewPlayback(): void {
  if (previewTimer.value !== null) clearTimeout(previewTimer.value)
  previewTimer.value = null
  previewPlaying.value = false
  currentFrameIndex.value = 0
  activeLayer.value = Math.min(activeLayer.value, (currentFrame.value?.layers.length || 1) - 1)
  renderAll()
  nextTick(centerOverviewOnViewport)
}
```

- [ ] **Step 6: Rewrite playback timing to honor the final delay**

Use one timer after every rendered frame:

```ts
function handleTogglePreview(): void {
  if (previewPlaying.value) {
    finishPreviewPlayback()
    return
  }
  if (!project.value.frames.length) return
  previewPlaying.value = true
  let index = 0
  const tick = () => {
    if (!previewPlaying.value) return
    const frame = project.value.frames[index]
    renderPlaybackFrame(compositeFrame(frame))
    previewTimer.value = window.setTimeout(() => {
      if (!previewPlaying.value) return
      if (index >= project.value.frames.length - 1) {
        finishPreviewPlayback()
        return
      }
      index += 1
      tick()
    }, frame.delay)
  }
  nextTick(tick)
}
```

Use `finishPreviewPlayback()` when deleting all frames during playback. Clear `previewTimer` during unmount without triggering rendering.

- [ ] **Step 7: Run targeted and neighboring tests**

```bash
node --test --test-name-pattern="animation cycle inside the editor canvas|animation-frame interaction|Canvas wheel gestures|device preview" tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/device-preview.test.ts
```

Expected: all selected tests PASS.

- [ ] **Step 8: Run static verification**

```bash
pnpm exec eslint src/modules/pixel-editor/components/editor/PixelEditor.vue tests/modules/pixel-editor/editor-ui-contract.test.ts
pnpm exec vue-tsc --noEmit
pnpm run build:qa
git diff --check
```

Record existing repository-wide lint/type baselines separately; no new diagnostic may originate from the changed playback code.

- [ ] **Step 9: Verify playback in the live editor**

Create at least three visibly distinct frames with longer delays and verify:

- no popup or extra canvas appears;
- pixels on `editorCanvasRef` change over time while selected-frame UI remains stable;
- the last frame remains for its configured delay;
- natural completion selects and displays frame one;
- manual stop selects and displays frame one;
- `aria-busy`, pointer blocking, zoomed canvas dimensions, and normal pointer editing restore correctly.

- [ ] **Step 10: Commit**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "feat: play animation in editor canvas"
```

## Self-Review

- Spec coverage: popup removal, inline rendering, one cycle, final dwell, shared frame-one reset, pointer lock, and unchanged surrounding behavior are covered.
- Placeholder scan: no deferred implementation or vague test step remains.
- Type consistency: helper names and signatures match every contract and call site.
