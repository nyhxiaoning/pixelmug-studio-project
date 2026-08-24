# Pixel Editor Central Canvas Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent 50%–300% zoom control that changes only the central Canvas display size and reports the current percentage in real time.

**Architecture:** Keep the Canvas backing store at 960×480 and introduce a dedicated percentage state for CSS display scaling. The existing `canvasPoint()` bounding-rectangle calculation remains unchanged, while the central viewport alone owns any overflow created above 100%.

**Tech Stack:** Vue 3 Composition API, TypeScript, SCSS, Lucide Vue, Node test runner, Vite.

## Global Constraints

- Canvas backing dimensions remain exactly 960×480.
- Zoom range is exactly 50%–300%, default 100%, step 10%.
- Navigation, tools, layers, overview, and frames layouts must not depend on central Canvas zoom.
- `overviewZoom`, project dimensions, pixel data, rendering functions, and `canvasPoint()` must not change.
- No new dependency.

---

### Task 1: Add Independent Canvas Zoom State, Controls, and Layout

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:481-501, 1010-1120, 2647-2662`
- Modify: `src/modules/pixel-editor/styles/index.scss:654-692`
- Modify: `src/locales/zh-CN/common.ts`
- Modify: `src/locales/en-US/common.ts`
- Modify: `src/locales/ja/common.ts`

**Interfaces:**
- Consumes: `editorCanvasRef`, `canvasPoint(event: PointerEvent): Point | null`, the 960×480 Canvas, `t()`.
- Produces: `EDITOR_CANVAS_WIDTH: 960`, `EDITOR_CANVAS_HEIGHT: 480`, `canvasZoom: Ref<number>`, `canvasZoomStyle: ComputedRef<Record<string, string>>`, `handleSetCanvasZoom(value: string | number): void`, `handleAdjustCanvasZoom(delta: number): void`.

- [ ] **Step 1: Write the failing Canvas zoom contract**

Append a test that extracts the Canvas metadata block, Canvas start tag, and zoom handlers. Lock these exact requirements:

```ts
test('zooms only the central Canvas from 50 to 300 percent', () => {
  assert.match(editorSource, /const CANVAS_ZOOM_MIN = 50/)
  assert.match(editorSource, /const CANVAS_ZOOM_MAX = 300/)
  assert.match(editorSource, /const CANVAS_ZOOM_STEP = 10/)
  assert.match(editorSource, /const EDITOR_CANVAS_WIDTH = 960/)
  assert.match(editorSource, /const EDITOR_CANVAS_HEIGHT = 480/)
  assert.match(editorSource, /const canvasZoom = ref<number>\(100\)/)
  assert.match(editorSource, /class="pe-canvas-zoom"/)
  assert.match(editorSource, /type="range"/)
  assert.match(editorSource, /:min="CANVAS_ZOOM_MIN"/)
  assert.match(editorSource, /:max="CANVAS_ZOOM_MAX"/)
  assert.match(editorSource, /:step="CANVAS_ZOOM_STEP"/)
  assert.match(editorSource, /@input="handleSetCanvasZoom\(\$event\.target\.value\)"/)
  assert.match(editorSource, /@click="handleAdjustCanvasZoom\(-CANVAS_ZOOM_STEP\)"/)
  assert.match(editorSource, /@click="handleAdjustCanvasZoom\(CANVAS_ZOOM_STEP\)"/)
  assert.match(editorSource, /<output[^>]*>\{\{ canvasZoom \}\}%<\/output>/)
  assert.match(editorSource, /:style="canvasZoomStyle"/)
  assert.match(editorSource, /:width="EDITOR_CANVAS_WIDTH"/)
  assert.match(editorSource, /:height="EDITOR_CANVAS_HEIGHT"/)
  assert.match(editorStyles, /align-items:\s*safe center/)
  assert.match(editorStyles, /justify-content:\s*safe center/)
})
```

Extend the locale contract so every locale must define `pxm_editor_zoom_out` and `pxm_editor_zoom_in`.

- [ ] **Step 2: Run the new test and confirm RED**

Run:

```bash
node --test --test-name-pattern="zooms only the central Canvas" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because no independent Canvas zoom state or controls exist.

- [ ] **Step 3: Add localized zoom button labels**

Add:

```ts
// zh-CN
pxm_editor_zoom_out: '缩小画板',
pxm_editor_zoom_in: '放大画板',

// en-US
pxm_editor_zoom_out: 'Zoom canvas out',
pxm_editor_zoom_in: 'Zoom canvas in',

// ja
pxm_editor_zoom_out: 'キャンバスを縮小',
pxm_editor_zoom_in: 'キャンバスを拡大',
```

- [ ] **Step 4: Add the independent state and clamped handlers**

Place adjacent to the Canvas refs/state:

```ts
const CANVAS_ZOOM_MIN = 50
const CANVAS_ZOOM_MAX = 300
const CANVAS_ZOOM_STEP = 10
const EDITOR_CANVAS_WIDTH = 960
const EDITOR_CANVAS_HEIGHT = 480
const canvasZoom = ref<number>(100)

const canvasZoomStyle = computed(() => ({
  width: `${canvasZoom.value}%`,
  maxWidth: `${EDITOR_CANVAS_WIDTH * (canvasZoom.value / 100)}px`,
}))

function handleSetCanvasZoom(value: string | number): void {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return
  canvasZoom.value = Math.max(CANVAS_ZOOM_MIN, Math.min(CANVAS_ZOOM_MAX, numeric))
}

function handleAdjustCanvasZoom(delta: number): void {
  handleSetCanvasZoom(canvasZoom.value + delta)
}
```

Do not use the existing core `CANVAS_WIDTH`: it is the 256-pixel world Canvas, not the 960-pixel editor backing store. Bind `:width="EDITOR_CANVAS_WIDTH"` and `:height="EDITOR_CANVAS_HEIGHT"` on `editorCanvasRef`, update the existing contract from literal attributes to these bindings, and do not touch `overviewZoom`.

- [ ] **Step 5: Replace the incorrect overview percentage in the Canvas metadata row**

Render:

```vue
<div class="pe-canvas-meta">
  <span>{{ t('common.pxm_editor_canvas') }} W {{ project.width }}, H {{ project.height }}</span>
  <div class="pe-canvas-zoom" role="group" :aria-label="t('common.pxm_editor_zoom')">
    <button
      type="button"
      :disabled="canvasZoom <= CANVAS_ZOOM_MIN"
      :title="t('common.pxm_editor_zoom_out')"
      :aria-label="t('common.pxm_editor_zoom_out')"
      @click="handleAdjustCanvasZoom(-CANVAS_ZOOM_STEP)"
    ><Minus :size="16" aria-hidden="true" /></button>
    <input
      :value="canvasZoom"
      type="range"
      :min="CANVAS_ZOOM_MIN"
      :max="CANVAS_ZOOM_MAX"
      :step="CANVAS_ZOOM_STEP"
      :aria-label="t('common.pxm_editor_zoom')"
      @input="handleSetCanvasZoom($event.target.value)"
    >
    <button
      type="button"
      :disabled="canvasZoom >= CANVAS_ZOOM_MAX"
      :title="t('common.pxm_editor_zoom_in')"
      :aria-label="t('common.pxm_editor_zoom_in')"
      @click="handleAdjustCanvasZoom(CANVAS_ZOOM_STEP)"
    ><Plus :size="16" aria-hidden="true" /></button>
    <output aria-live="polite">{{ canvasZoom }}%</output>
  </div>
  <span v-if="hoverPoint">({{ hoverPoint.x }}, {{ hoverPoint.y }})</span>
</div>
```

Import `Minus` from `lucide-vue-next`; `Plus` already exists.

Add `:style="canvasZoomStyle"`, `:width="EDITOR_CANVAS_WIDTH"`, and `:height="EDITOR_CANVAS_HEIGHT"` to the existing `editorCanvasRef` Canvas. Keep the resolved 960×480 backing size and all five pointer bindings unchanged.

- [ ] **Step 6: Make only the central viewport scroll and center safely**

Update the Canvas styles:

```scss
.pe-canvas-meta {
  justify-content: space-between;
}

.pe-canvas-zoom {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.pe-canvas-zoom button {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  padding: 0;
}

.pe-canvas-zoom input {
  width: 132px;
}

.pe-canvas-zoom output {
  width: 48px;
  color: var(--pe-text);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.pe-canvas-viewport {
  display: flex;
  align-items: safe center;
  justify-content: safe center;
  overflow: auto;
}

.pe-canvas-viewport canvas {
  flex: 0 0 auto;
  height: auto;
  max-width: none;
  margin: 0;
}
```

Remove the old static `width: min(100%, 960px)` because the inline zoom style now owns display width.

- [ ] **Step 7: Run targeted tests and build**

Run:

```bash
node --test tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/device-preview.test.ts
pnpm run build:qa
git diff --check
```

Expected: all commands exit 0. Record the repository's existing full `vue-tsc` and ESLint baseline separately; do not claim they are globally green.

- [ ] **Step 8: Commit the zoom implementation**

```bash
git add tests/modules/pixel-editor/editor-ui-contract.test.ts src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss src/locales/zh-CN/common.ts src/locales/en-US/common.ts src/locales/ja/common.ts
git commit -m "feat: add central canvas zoom controls"
```

---

### Task 2: Verify Zoom Boundaries, Layout Stability, and Pointer Accuracy

**Files:**
- Modify only if verification exposes a defect: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify only if verification exposes a defect: `src/modules/pixel-editor/components/editor/PixelEditor.vue`
- Modify only if verification exposes a defect: `src/modules/pixel-editor/styles/index.scss`

**Interfaces:**
- Consumes: `canvasZoom`, the Canvas controls from Task 1, `canvasPoint()`.
- Produces: browser evidence that zoom affects only the central Canvas.

- [ ] **Step 1: Run fresh automated checks**

```bash
node --test tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/device-preview.test.ts
pnpm run build:qa
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Verify 50%, 100%, and 300% in a browser**

At a 1440×754 viewport, record the bounding boxes of `.pe-editor-nav`, `.pe-tools-panel`, `.pe-canvas-panel`, `.pe-layers-panel`, and `.pe-frame-panel` at 100%. Move the slider to 50% and 300% and confirm those five bounding boxes remain unchanged.

Expected Canvas behavior:

- 50%: centered, no page-level overflow.
- 100%: same display size as before the feature.
- 300%: only `.pe-canvas-viewport` gains scrollable overflow; the left/top edges remain reachable.
- Live output reads exactly `50%`, `100%`, and `300%`.

- [ ] **Step 3: Verify button boundaries**

- Click decrement until 50%; it becomes disabled and the value never falls below 50%.
- Click increment until 300%; it becomes disabled and the value never exceeds 300%.
- Move the slider after using buttons and confirm the value stays synchronized.

- [ ] **Step 4: Verify logical pointer coordinates**

At 50%, 100%, and 300%, draw in logical cells near the top-left, center, and bottom-right. Confirm the same intended logical cells change and Undo restores them. Confirm `canvasPoint()` remains unchanged in the source diff.

- [ ] **Step 5: Inspect forbidden scope expansion**

```bash
git diff --name-only HEAD~1..HEAD -- src/modules/pixel-editor/core src/api src/lib/images
```

Expected: no output.

- [ ] **Step 6: Commit verification fixes only if needed**

If browser verification exposes a defect, commit only the minimal correction and its regression contract:

```bash
git add tests/modules/pixel-editor/editor-ui-contract.test.ts src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss
git commit -m "fix: preserve canvas zoom coordinate accuracy"
```

If no correction is required, do not create an empty commit.
