# Pixel Editor Canvas Gesture Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Canvas-local wheel and trackpad-pinch zoom with a grab cursor, pointer-position anchoring, and strict 50%–300% event containment.

**Architecture:** Keep behavior in the live `PixelEditor.vue` component. Bind a non-passive wheel handler to the actual central Canvas, reuse the existing zoom setter/constants, and use an explicit viewport ref plus `nextTick()` to restore the pointer anchor after CSS resizing. Preserve drawing pointer handlers and the independent overview zoom.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, TypeScript, SCSS, Node test runner, Vite QA build, in-app browser QA.

## Global Constraints

- Support normal wheel, `Ctrl`/`Cmd` + wheel, and trackpad pinch over the actual central Canvas.
- Zoom in fixed 10% steps and clamp to 50%–300%.
- Consume outward gestures at both limits so the page and browser do not continue scrolling or zooming.
- Keep the logical Canvas point beneath the pointer stable after zoom whenever scrolling bounds allow.
- Do not change drawing pointer handlers, `canvasPoint()`, overview zoom, side panels, navigation, or frame layout.
- Add no dependencies.

---

### Task 1: Lock the Canvas Gesture Contract

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`

**Interfaces:**
- Consumes: existing `CANVAS_ZOOM_MIN`, `CANVAS_ZOOM_MAX`, `CANVAS_ZOOM_STEP`, `handleSetCanvasZoom()`.
- Produces: regression contract for `canvasViewportRef` and `handleCanvasWheel(event: WheelEvent): Promise<void>`.

- [ ] **Step 1: Write the failing contract test**

Add a test that extracts the live Canvas tag and `handleCanvasWheel` brace block and asserts:

```ts
assert.match(editorSource, /ref="canvasViewportRef"/)
assert.match(editorCanvasTag, /@wheel="handleCanvasWheel"/)
assert.doesNotMatch(editorCanvasTag, /@wheel\.passive/)
assert.match(wheelHandler, /event\.preventDefault\(\)/)
assert.match(wheelHandler, /event\.deltaY < 0 \? CANVAS_ZOOM_STEP : -CANVAS_ZOOM_STEP/)
assert.match(wheelHandler, /handleSetCanvasZoom\(nextZoom\)/)
assert.match(wheelHandler, /await nextTick\(\)/)
assert.match(wheelHandler, /viewport\.scrollLeft \+=/)
assert.match(wheelHandler, /viewport\.scrollTop \+=/)
assert.doesNotMatch(wheelHandler, /overviewZoom/)
```

- [ ] **Step 2: Run the test and confirm RED**

Run `node --test tests/modules/pixel-editor/editor-ui-contract.test.ts`.

Expected: FAIL because the viewport ref, wheel binding, and handler do not exist.

- [ ] **Step 3: Strengthen boundary assertions**

Require `event.preventDefault()` before early returns, exact clamping, and a no-op return when already at a boundary:

```ts
assert.match(wheelHandler, /Math\.max\(CANVAS_ZOOM_MIN, Math\.min\(CANVAS_ZOOM_MAX,/)
assert.match(wheelHandler, /if \(nextZoom === canvasZoom\.value\) return/)
assert.ok(wheelHandler.indexOf('event.preventDefault()') < wheelHandler.indexOf('if (event.deltaY === 0) return'))
```

- [ ] **Step 4: Carry the red contract into Task 2**

Do not commit a deliberately failing repository state separately.

---

### Task 2: Implement Canvas-Local Anchored Gesture Zoom

**Files:**
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue`
- Modify: `src/modules/pixel-editor/styles/index.scss`
- Test: `tests/modules/pixel-editor/editor-ui-contract.test.ts`

**Interfaces:**
- Consumes: `editorCanvasRef`, `canvasZoom`, `handleSetCanvasZoom()`, zoom constants, Vue `nextTick()`.
- Produces: `canvasViewportRef: Ref<HTMLDivElement | null>` and `handleCanvasWheel(event: WheelEvent): Promise<void>`.

- [ ] **Step 1: Add the viewport ref and Canvas wheel binding**

```vue
<div ref="canvasViewportRef" class="pe-canvas-viewport">
  <canvas ref="editorCanvasRef" @wheel="handleCanvasWheel" />
</div>
```

Do not use `.passive`, `.prevent`, or a global listener; the handler owns prevention and remains Canvas-scoped.

- [ ] **Step 2: Implement bounded pointer-anchored zoom**

```ts
const canvasViewportRef = ref<HTMLDivElement | null>(null)

async function handleCanvasWheel(event: WheelEvent): Promise<void> {
  event.preventDefault()
  if (event.deltaY === 0) return

  const canvas = editorCanvasRef.value
  const viewport = canvasViewportRef.value
  if (!canvas || !viewport) return

  const delta = event.deltaY < 0 ? CANVAS_ZOOM_STEP : -CANVAS_ZOOM_STEP
  const nextZoom = Math.max(
    CANVAS_ZOOM_MIN,
    Math.min(CANVAS_ZOOM_MAX, canvasZoom.value + delta)
  )
  if (nextZoom === canvasZoom.value) return

  const rect = canvas.getBoundingClientRect()
  const anchorX = (event.clientX - rect.left) / rect.width
  const anchorY = (event.clientY - rect.top) / rect.height
  handleSetCanvasZoom(nextZoom)
  await nextTick()

  const nextRect = canvas.getBoundingClientRect()
  viewport.scrollLeft += nextRect.left + anchorX * nextRect.width - event.clientX
  viewport.scrollTop += nextRect.top + anchorY * nextRect.height - event.clientY
}
```

- [ ] **Step 3: Change only the central Canvas cursor**

```scss
.pe-canvas-viewport canvas {
  cursor: grab;
}
```

Do not alter overview/import cursors or add drag-to-pan behavior.

- [ ] **Step 4: Run targeted tests and confirm GREEN**

Run `node --test tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/device-preview.test.ts`.

Expected: 22 tests pass.

- [ ] **Step 5: Run static verification**

Run `pnpm run build:qa` and `git diff --check`.

Expected: QA build succeeds; only existing Browserslist and chunk-size warnings may remain; diff check is clean.

- [ ] **Step 6: Commit**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "feat: add canvas gesture zoom"
```

---

### Task 3: Browser Verification at 50%, 100%, and 300%

**Files:**
- Modify only if QA finds a reproducible defect in the planned behavior.

**Interfaces:**
- Consumes: completed gesture zoom behavior.
- Produces: browser evidence for wheel, modifier gestures, boundaries, anchoring, and layout isolation.

- [ ] **Step 1: Open the local editor**

Use `http://localhost:3037/#/pixel-editor` with a 1440px desktop viewport.

- [ ] **Step 2: Verify direct wheel and live percentage**

Move over the central Canvas, send wheel up/down, and verify exactly 10% per event. Move outside the Canvas and verify central zoom does not change.

- [ ] **Step 3: Verify modifier/pinch paths**

Send cancelable Canvas wheel events with `ctrlKey: true` and `metaKey: true`; verify both use the same central zoom path and do not change browser page scale.

- [ ] **Step 4: Verify strict boundaries**

At 50%, send another zoom-out and confirm the Canvas stays 50% and the page does not scroll. At 300%, send another zoom-in and confirm the Canvas stays 300% and browser page zoom remains unchanged.

- [ ] **Step 5: Verify anchor, coordinates, and layout**

At 50%, 100%, and 300%, verify a known logical cell remains correct after zoom. Navigation, tools, Canvas panel, layers, and frames must retain their bounding boxes; 300% overflow stays inside `.pe-canvas-viewport`.

- [ ] **Step 6: Final verification and cleanup**

Remove any DEV-only browser harness, stop the server, rerun the 22 targeted tests and QA build, then run `git diff --check` and `git status --short`.

