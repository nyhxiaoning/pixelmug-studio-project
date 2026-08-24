# Pixel Editor Reference UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the active pixel editor view shell to match the Creator Center “Create” editor while preserving the existing Canvas engine, project behavior, persistence, import/export, and device-preview flows.

**Architecture:** Keep `PixelEditor.vue` as the state and behavior owner. Restructure only its active template into a sticky header plus tools/canvas/layers/frames grid, then implement the reference visual system in the active `styles/index.scss`. Use source-contract tests for structure and CSS tokens because the repository has no Vue component-test dependency; retain existing behavior tests and add browser/manual regression gates for Canvas interactions.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, SCSS, Element Plus dropdowns, Lucide Vue icons already present in the repository, Node’s built-in test runner, Vite, vue-tsc.

## Global Constraints

- The live Creator Center “Create” editor is the visual and interaction source of truth.
- Preserve the current Canvas renderer and all existing project behavior.
- Do not replace Canvas pixels with DOM pixel buttons.
- Do not change project, frame, layer, editable JSON, OSS, or device-preview data contracts.
- Preserve dirty-save-before-preview behavior.
- Do not route through the unused `EditorShell.vue` component tree.
- Do not add dependencies.
- Desktop fidelity is the first-release target; below 1024 px, preserve a minimum-width editor surface with horizontal scrolling.
- Use existing Chinese, English, and Japanese localization infrastructure; do not hard-code user-visible English copy.

---

## File Map

- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue`
  - Owns the active editor template, state, refs, and all existing behavior handlers.
  - Receives the new header, grid regions, menus, icon controls, and accessibility attributes.
- Modify: `src/modules/pixel-editor/styles/index.scss`
  - Owns the active editor design tokens, five-region layout, component visuals, overflow rules, and breakpoints.
- Modify: `src/locales/zh-CN/common.ts`
  - Adds any missing reference-editor menu, tooltip, count, and accessibility labels.
- Modify: `src/locales/en-US/common.ts`
  - Mirrors the new localization keys in English.
- Modify: `src/locales/ja/common.ts`
  - Mirrors the new localization keys in Japanese.
- Create: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
  - Locks the active source path, reference tokens, region structure, handler bindings, Canvas invariants, and responsive contract without adding a Vue test framework.
- Existing verification: `tests/modules/pixel-editor/device-preview.test.ts`
  - Proves dirty-save-before-preview ordering remains unchanged.
- Existing design source: `docs/plans/2026-08-24-pixel-editor-reference-ui-design.md`
  - Defines the accepted visual, behavioral, responsive, and non-goal contract.

---

### Task 1: Lock the Reference Tokens and Active Editor Boundary

**Files:**
- Create: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/styles/index.scss:6-58`

**Interfaces:**
- Consumes: Active editor template path and stylesheet path.
- Produces: Stable CSS custom properties used by every later layout task.

- [ ] **Step 1: Write the failing token contract test**

Create `tests/modules/pixel-editor/editor-ui-contract.test.ts` with:

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const editorSource = readFileSync(
  new URL('../../../src/modules/pixel-editor/components/editor/PixelEditor.vue', import.meta.url),
  'utf8'
)
const editorStyles = readFileSync(
  new URL('../../../src/modules/pixel-editor/styles/index.scss', import.meta.url),
  'utf8'
)

test('defines the Creator Center reference layout tokens', () => {
  assert.match(editorStyles, /--pe-nav-height:\s*57px/)
  assert.match(editorStyles, /--pe-shell-gap:\s*14px/)
  assert.match(editorStyles, /--pe-side-panel-width:\s*260px/)
  assert.match(editorStyles, /--pe-panel-radius:\s*8px/)
  assert.match(editorStyles, /--pe-reference-border:\s*#e1e6ec/)
})

test('keeps PixelEditor as the active behavior owner', () => {
  assert.match(editorSource, /ref="editorCanvasRef"/)
  assert.match(editorSource, /@pointerdown="handlePointerDown"/)
  assert.match(editorSource, /@pointermove="handlePointerMove"/)
  assert.match(editorSource, /@pointerup="handlePointerUp"/)
})
```

- [ ] **Step 2: Run the test and verify the token case fails**

Run:

```bash
node --test tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: the token test fails because the five reference custom properties do not exist; the Canvas ownership test passes.

- [ ] **Step 3: Add the reference tokens without deleting existing semantic variables**

Add these declarations at the start of `.pe-theme-host`:

```scss
--pe-nav-height: 57px;
--pe-shell-gap: 14px;
--pe-side-panel-width: 260px;
--pe-panel-radius: 8px;
--pe-reference-border: #e1e6ec;
--pe-reference-page: #f4f6f8;
--pe-reference-control: #eef2f6;
--pe-reference-selected: #e3f8ee;
--pe-reference-danger: #fff4f6;
--pe-reference-ink: #191919;
```

Update the light-theme semantic variables to use the reference values while retaining the existing variable names:

```scss
--pe-bg: var(--pe-reference-page);
--pe-panel: #ffffff;
--pe-panel-2: var(--pe-reference-control);
--pe-line: var(--pe-reference-border);
--pe-panel-border: var(--pe-reference-border);
--pe-text: #242424;
--pe-muted: #7d8794;
--pe-active-bg: var(--pe-reference-selected);
--pe-danger-border: #ff9aaa;
--pe-shadow: none;
```

- [ ] **Step 4: Run the contract test**

Run:

```bash
node --test tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Commit the token baseline**

```bash
git add tests/modules/pixel-editor/editor-ui-contract.test.ts src/modules/pixel-editor/styles/index.scss
git commit -m "test: lock pixel editor reference UI tokens"
```

---

### Task 2: Build the Sticky Top Navigation and Import/Export Menus

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:50-341, 601-621, 3302-3309`
- Modify: `src/modules/pixel-editor/styles/index.scss:60-228, 414-438`
- Modify: `src/locales/zh-CN/common.ts`
- Modify: `src/locales/en-US/common.ts`
- Modify: `src/locales/ja/common.ts`

**Interfaces:**
- Consumes: `backHome`, `project.name`, `project.frames`, `currentFrame.layers`, `handleStaticFileInputClick`, `handleGifFileInputClick`, `handleExportPng`, `handleExportGif`, `sendWorkToDevice`, `handleSaveToOSS`, `saving`.
- Produces: `handleImportCommand(command: 'static' | 'animated'): void` and `handleExportCommand(command: 'png' | 'gif'): void` for the top menus.

- [ ] **Step 1: Add the failing navigation contract**

Append:

```ts
test('renders the reference top navigation with existing behavior bindings', () => {
  assert.match(editorSource, /class="pe-editor-nav"/)
  assert.match(editorSource, /class="pe-nav-title"/)
  assert.match(editorSource, /project\.frames\.length/)
  assert.match(editorSource, /currentFrame\.layers\.length/)
  assert.match(editorSource, /@command="handleImportCommand"/)
  assert.match(editorSource, /@command="handleExportCommand"/)
  assert.match(editorSource, /@click\.stop="sendWorkToDevice"/)
  assert.match(editorSource, /@click="handleSaveToOSS"/)
  assert.match(editorSource, /@click="backHome"/)
})
```

- [ ] **Step 2: Run the navigation case and verify it fails**

```bash
node --test --test-name-pattern="reference top navigation" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because `.pe-editor-nav` and menu command bindings do not exist.

- [ ] **Step 3: Add typed menu command handlers**

Add next to the existing file-input click handlers:

```ts
function handleImportCommand(command: 'static' | 'animated'): void {
  if (command === 'static') {
    handleStaticFileInputClick()
    return
  }
  handleGifFileInputClick()
}

function handleExportCommand(command: 'png' | 'gif'): void {
  if (command === 'png') {
    handleExportPng()
    return
  }
  handleExportGif()
}
```

- [ ] **Step 4: Replace the old editor toolbar with the reference header**

Use this exact region structure at the top of the template, keeping the two hidden file inputs inside the navigation:

```vue
<div class="pe-app-shell pe-theme-host" :data-theme="theme">
  <header class="pe-editor-nav">
    <div class="pe-nav-start">
      <button type="button" class="pe-nav-back" :title="t('common.pxm_editor_back_home')" @click="backHome">
        <img :src="pixelEditorIcon" alt="" />
      </button>
      <input
        v-model.trim="project.name"
        class="pe-nav-title"
        :aria-label="t('common.pxm_editor_project_name')"
        @change="handleRenameProject"
      />
    </div>

    <div class="pe-nav-counts" aria-live="polite">
      {{ project.frames.length }} {{ t('common.pxm_editor_frame_unit') }} ·
      {{ currentFrame.layers.length }} {{ t('common.pxm_editor_layer_unit') }}
    </div>

    <div class="pe-nav-actions">
      <input ref="staticFileInputRef" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="handleLoadStaticImage" />
      <input ref="gifFileInputRef" type="file" accept="image/gif" hidden @change="handleLoadGifImage" />

      <el-dropdown trigger="click" @command="handleImportCommand">
        <button type="button" class="pe-nav-action">{{ t('common.pxm_editor_import') }}</button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="static">{{ t('common.pxm_editor_import_static') }}</el-dropdown-item>
            <el-dropdown-item command="animated">{{ t('common.pxm_editor_import_animated') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-dropdown trigger="click" @command="handleExportCommand">
        <button type="button" class="pe-nav-action">{{ t('common.pxm_editor_export') }}</button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="png">{{ t('common.pxm_editor_export_png') }}</el-dropdown-item>
            <el-dropdown-item command="gif">{{ t('common.pxm_editor_export_gif') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <button type="button" class="pe-nav-action" @click.stop="sendWorkToDevice">
        {{ t('common.pxm_action_preview') }}
      </button>
      <button type="button" class="pe-nav-save" :disabled="saving" @click="handleSaveToOSS">
        {{ t('common.pxm_editor_save') }}
      </button>
    </div>
  </header>
```

Import the existing editor icon near the other imports:

```ts
import pixelEditorIcon from '@/modules/pixel-editor/icon.png'
```

Change the theme initialization so the reference light theme is the default while preserving a stored dark preference:

```ts
const storedTheme = localStorage.getItem(THEME_KEY)
const theme = ref<'dark' | 'light'>(storedTheme === 'dark' ? 'dark' : 'light')
```

Retain `ThemeSwitcher` in a compact secondary settings surface instead of deleting it; place it at the bottom of the tools panel with an accessible theme heading so theme behavior remains available without changing the reference header.

- [ ] **Step 5: Style the 57 px sticky navigation**

Add:

```scss
.pe-editor-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  height: var(--pe-nav-height);
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto minmax(380px, 1fr);
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: #fff;
  border-bottom: 1px solid var(--pe-reference-border);
}

.pe-nav-start,
.pe-nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pe-nav-actions {
  justify-content: flex-end;
}

.pe-nav-title {
  width: min(320px, 28vw);
  border: 0;
  padding: 6px 8px;
  background: transparent;
  color: var(--pe-text);
  font-weight: 700;
}

.pe-nav-counts {
  color: var(--pe-muted);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.pe-nav-action,
.pe-nav-save {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 8px;
}

.pe-nav-save {
  background: var(--pe-reference-ink);
  color: #fff;
}
```

- [ ] **Step 6: Add missing localization keys consistently**

Add the same keys to all three locale files, with locale-appropriate values:

```ts
pxm_editor_project_name: '作品名称',
pxm_editor_theme: '主题',
pxm_editor_canvas: '画板',
```

Use `Project name`, `Theme`, `Canvas` in English and `作品名`, `テーマ`, `キャンバス` in Japanese. Keep the existing `pxm_editor_project_name_updated` key for the rename status emitted by `handleRenameProject`.

- [ ] **Step 7: Run contract, type, and build checks**

```bash
node --test tests/modules/pixel-editor/editor-ui-contract.test.ts
pnpm exec vue-tsc --noEmit
pnpm run build:qa
```

Expected: all commands exit 0.

- [ ] **Step 8: Commit the navigation slice**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss src/locales/zh-CN/common.ts src/locales/en-US/common.ts src/locales/ja/common.ts tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "feat: add pixel editor reference navigation"
```

---

### Task 3: Rebuild the Left Tools Panel with Reference Grouping and Icons

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:51-292, 601-688, 776-802, 923-925`
- Modify: `src/modules/pixel-editor/styles/index.scss:285-413`

**Interfaces:**
- Consumes: `drawingTools`, `activeTool`, `currentColor`, `palette`, `shapeType`, `shapeFill`, selection handlers, `onion`, `textTool`, `handleStampText`, `ThemeSwitcher`.
- Produces: `toolIcon(toolId: string): Component` for rendering existing tool IDs with Lucide icons.

- [ ] **Step 1: Add the failing tools-panel contract**

Append:

```ts
test('groups tools in the live reference order', () => {
  const toolsIndex = editorSource.indexOf('pe-tool-section--drawing')
  const shapesIndex = editorSource.indexOf('pe-tool-section--shapes')
  const selectionIndex = editorSource.indexOf('pe-tool-section--selection')
  const onionIndex = editorSource.indexOf('pe-tool-section--onion')
  const gradientIndex = editorSource.indexOf('pe-tool-section--gradient')
  const textIndex = editorSource.indexOf('pe-tool-section--text')

  assert.ok(toolsIndex >= 0)
  assert.ok(toolsIndex < shapesIndex)
  assert.ok(shapesIndex < selectionIndex)
  assert.ok(selectionIndex < onionIndex)
  assert.ok(onionIndex < gradientIndex)
  assert.ok(gradientIndex < textIndex)
  assert.match(editorSource, /<component :is="toolIcon\(tool\.id\)"/)
})
```

- [ ] **Step 2: Verify the new case fails**

```bash
node --test --test-name-pattern="groups tools" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because the section modifier classes and icon renderer are absent.

- [ ] **Step 3: Import and map existing Lucide icons**

Add:

```ts
import type { Component } from 'vue'
import {
  Brush,
  Copy,
  Eraser,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  Grid2X2,
  Move,
  PaintBucket,
  Pipette,
  Redo2,
  RotateCcw,
  RotateCw,
  Scissors,
  Sparkles,
  Trash2,
  Undo2,
  WandSparkles,
} from 'lucide-vue-next'

const toolIcons: Record<string, Component> = {
  pencil: Brush,
  eraser: Eraser,
  fill: PaintBucket,
  eyedropper: Pipette,
  shape: Grid2X2,
  select: Sparkles,
  move: Move,
  magic: WandSparkles,
}

function toolIcon(toolId: string): Component {
  return toolIcons[toolId] || Brush
}
```

- [ ] **Step 4: Reorder the left template and replace text-only tool buttons**

Use `<aside class="pe-panel pe-tools-panel">` as the first workspace region. Mark each section with the tested modifier classes. For drawing tools, use:

```vue
<section class="pe-tool-section pe-tool-section--drawing">
  <h2>{{ t('common.pxm_editor_tools') }}</h2>
  <div class="pe-tool-grid pe-tool-grid--five" role="toolbar">
    <button
      v-for="tool in drawingTools"
      :key="tool.id"
      type="button"
      class="pe-icon-tool"
      :class="{ active: activeTool === tool.id }"
      :title="tool.label"
      :aria-label="tool.label"
      @click="handleSelectTool(tool.id)"
    >
      <component :is="toolIcon(tool.id)" :size="18" aria-hidden="true" />
    </button>
  </div>
</section>
```

Keep every current selection and transformation handler. Render them as icon buttons using the imported icons, preserving the current handler signatures:

```vue
<button type="button" class="pe-icon-tool" :title="t('common.pxm_editor_copy')" @click="handleCopySelection(false)"><Copy :size="18" /></button>
<button type="button" class="pe-icon-tool" :title="t('common.pxm_editor_cut')" @click="handleCopySelection(true)"><Scissors :size="18" /></button>
<button type="button" class="pe-icon-tool pe-icon-tool--danger" :title="t('common.pxm_editor_erase')" @click="handleDeleteSelection"><Eraser :size="18" /></button>
<button type="button" class="pe-icon-tool" :title="t('common.pxm_editor_rotate_cw')" @click="handleTransformSelection('rotate-cw')"><RotateCw :size="18" /></button>
<button type="button" class="pe-icon-tool" :title="t('common.pxm_editor_rotate_ccw')" @click="handleTransformSelection('rotate-ccw')"><RotateCcw :size="18" /></button>
<button type="button" class="pe-icon-tool" :title="t('common.pxm_editor_flip_x')" @click="handleTransformSelection('flip-h')"><FlipHorizontal2 :size="18" /></button>
<button type="button" class="pe-icon-tool" :title="t('common.pxm_editor_flip_y')" @click="handleTransformSelection('flip-v')"><FlipVertical2 :size="18" /></button>
<button type="button" class="pe-icon-tool" :title="t('common.pxm_editor_undo')" @click="handleUndo"><Undo2 :size="18" /></button>
<button type="button" class="pe-icon-tool" :title="t('common.pxm_editor_redo')" @click="handleRedo"><Redo2 :size="18" /></button>
<button type="button" class="pe-icon-tool pe-icon-tool--danger" :title="t('common.pxm_editor_clear_layer')" @click="handleClearLayer"><Trash2 :size="18" /></button>
```

Move static/GIF import and PNG/GIF export controls out of the tools panel because Task 2 exposes them in the header. Move `ThemeSwitcher` to the tools-panel footer under `t('common.pxm_editor_theme')`.

- [ ] **Step 5: Implement the compact 260 px tools styling**

Add or replace with:

```scss
.pe-tools-panel {
  grid-area: tools;
  width: var(--pe-side-panel-width);
  height: calc(100vh - var(--pe-nav-height) - (var(--pe-shell-gap) * 2));
  padding: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.pe-tool-section {
  padding: 10px;
}

.pe-tool-section + .pe-tool-section {
  border-top: 1px solid var(--pe-reference-border);
}

.pe-tool-section h2 {
  margin: 0 0 8px;
  font-size: 14px;
}

.pe-tool-grid--five {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.pe-icon-tool {
  min-width: 0;
  min-height: 40px;
  display: grid;
  place-items: center;
  padding: 0;
  background: var(--pe-reference-control);
}

.pe-icon-tool.active {
  background: var(--pe-reference-selected);
  border-color: var(--pe-primary);
  color: var(--pe-primary-dark);
}

.pe-icon-tool--danger {
  color: var(--pe-danger-text);
}
```

- [ ] **Step 6: Run contract, type, and build checks**

```bash
node --test tests/modules/pixel-editor/editor-ui-contract.test.ts
pnpm exec vue-tsc --noEmit
pnpm run build:qa
```

Expected: all commands exit 0.

- [ ] **Step 7: Manually verify tool behavior**

Run `pnpm run dev`, open `/pixel-editor`, and verify:

- Selecting brush, eraser, fill, picker, shape, selection, move, and magic changes the selected green state.
- Copy, cut, erase, rotate, flip, undo, redo, and clear-layer invoke their current handlers.
- The bottom text and theme controls remain reachable at a 754 px viewport height.

- [ ] **Step 8: Commit the tools slice**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "feat: match reference pixel editor tools panel"
```

---

### Task 4: Create the Three-Column Workspace and Preserve Canvas Invariants

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:294-510`
- Modify: `src/modules/pixel-editor/styles/index.scss:285-291, 414-576`

**Interfaces:**
- Consumes: `editorCanvasRef`, Canvas dimensions `960 × 480`, pointer handlers, `hoverPoint`, `currentFrame`, layer handlers, overview refs and handlers.
- Produces: CSS grid areas `tools`, `canvas`, `layers`, and `frames`; `.pe-canvas-viewport` as the Canvas overflow boundary.

- [ ] **Step 1: Add failing grid and Canvas invariant tests**

Append:

```ts
test('renders the reference workspace grid without changing Canvas behavior', () => {
  assert.match(editorSource, /class="pe-editor-grid"/)
  assert.match(editorSource, /class="pe-panel pe-canvas-panel"/)
  assert.match(editorSource, /class="pe-canvas-viewport"/)
  assert.match(editorSource, /class="pe-panel pe-layers-panel"/)
  assert.match(editorSource, /width="960"/)
  assert.match(editorSource, /height="480"/)
  assert.match(editorSource, /@pointercancel="handlePointerUp"/)
  assert.match(editorStyles, /grid-template-areas:\s*['"]tools canvas layers['"]/)
})
```

- [ ] **Step 2: Verify the new test fails**

```bash
node --test --test-name-pattern="workspace grid" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because the new grid and Canvas viewport classes are absent.

- [ ] **Step 3: Build the active grid around the existing controls**

Immediately after the header, wrap the existing Task 3 tools `aside`, the Canvas panel, the layers panel, and the later Task 5 frame panel in `<main class="pe-editor-scroll"><div class="pe-editor-grid">`. Reparent the tools `aside` without changing its inner bindings. Replace the old `.pe-canvas-layer-row` wrapper with this exact Canvas panel:

```vue
<section class="pe-panel pe-canvas-panel">
  <div class="pe-canvas-meta">
    <span>{{ t('common.pxm_editor_canvas') }} W {{ project.width }}, H {{ project.height }}</span>
    <strong>{{ t('common.pxm_editor_zoom') }} {{ Math.round(overviewZoom * 100) }}%</strong>
    <span v-if="hoverPoint">({{ hoverPoint.x }}, {{ hoverPoint.y }})</span>
  </div>
  <div class="pe-canvas-viewport">
    <canvas
      ref="editorCanvasRef"
      width="960"
      height="480"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @pointerleave="handlePointerLeave"
    />
  </div>
</section>
```

Move the existing `<section class="pe-panel pe-layers-panel">` block from the old `.pe-canvas-layer-row` into the same `.pe-editor-grid`, immediately after the Canvas panel. Keep its entire layer list, overview Canvas, zoom control, save-overview action, and hover coordinates together.

- [ ] **Step 4: Implement the reference grid and Canvas viewport CSS**

```scss
.pe-app-shell {
  min-width: 1024px;
  min-height: 100vh;
  background: var(--pe-reference-page);
  color: var(--pe-text);
}

.pe-editor-scroll {
  min-width: 1024px;
  overflow-x: auto;
}

.pe-editor-grid {
  display: grid;
  grid-template-columns: var(--pe-side-panel-width) minmax(520px, 1fr) var(--pe-side-panel-width);
  grid-template-areas:
    "tools canvas layers"
    "tools frames frames";
  gap: var(--pe-shell-gap);
  padding: var(--pe-shell-gap);
  align-items: stretch;
}

.pe-canvas-panel {
  grid-area: canvas;
  min-width: 0;
  min-height: 526px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding: 14px;
}

.pe-canvas-meta {
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--pe-muted);
  font-size: 13px;
}

.pe-canvas-meta strong {
  color: var(--pe-text);
}

.pe-canvas-viewport {
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: auto;
  overscroll-behavior: contain;
}

.pe-canvas-viewport canvas {
  width: min(100%, 960px);
  height: auto;
  aspect-ratio: 2 / 1;
  display: block;
  background: var(--pe-canvas-bg);
  border: 1px solid #303640;
  border-radius: 6px;
  image-rendering: pixelated;
  touch-action: none;
}

.pe-layers-panel {
  grid-area: layers;
  width: var(--pe-side-panel-width);
  min-height: 526px;
  overflow: auto;
}
```

- [ ] **Step 5: Preserve the layer and overview bindings exactly**

After moving the layer region, confirm the committed template still contains:

```vue
@click="handleSelectLayer(index)"
@change="handleUpdateLayerSettings"
@input="handleUpdateLayerSettings"
@click.stop="handleDeleteLayer(index)"
ref="overviewScrollRef"
:ref="setOverviewCanvasRef"
@pointerdown="handleJumpViewportFromOverview"
```

Do not change the four-layer maximum or two-layer minimum in this UI pass.

- [ ] **Step 6: Run contract and existing behavior tests**

```bash
node --test tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/device-preview.test.ts tests/lib/images/rgb.test.ts
pnpm exec vue-tsc --noEmit
pnpm run build:qa
```

Expected: all commands exit 0.

- [ ] **Step 7: Manually verify Canvas coordinates**

At zoom values 100%, 200%, 400%, and 800%:

- Click the four logical corners and confirm the expected cells are modified.
- Draw a diagonal drag and confirm no cursor-to-pixel offset.
- Draw a rectangle and confirm start/end coordinates.
- Create and move a selection.
- Confirm scrolling the Canvas viewport does not alter coordinate mapping.

- [ ] **Step 8: Commit the workspace slice**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "feat: add reference pixel editor workspace grid"
```

---

### Task 5: Match the Reference Layers Rows and Animation Frames Panel

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:343-406, 425-509, 2243-2272, 2939-2964`
- Modify: `src/modules/pixel-editor/styles/index.scss:560-657`

**Interfaces:**
- Consumes: existing layer selection/settings/add/delete handlers; frame add/duplicate/delete/select/drag handlers; `frameDelayInput`; `handleTogglePreview`; frame thumbnail refs.
- Produces: Reference layer rows and `.pe-frame-panel` in grid area `frames`.

- [ ] **Step 1: Add failing layers and frames contracts**

Append:

```ts
test('renders reference layer rows and animation frame controls', () => {
  assert.match(editorSource, /class="pe-layer-visibility"/)
  assert.match(editorSource, /class="pe-layer-opacity"/)
  assert.match(editorSource, /class="pe-frame-panel"/)
  assert.match(editorSource, /@click="handleTogglePreview"/)
  assert.match(editorSource, /@click="handleAddFrame"/)
  assert.match(editorSource, /@click="handleDuplicateFrame"/)
  assert.match(editorSource, /@click="handleDeleteFrame"/)
  assert.match(editorSource, /@drop\.prevent="handleDropFrame\(index\)"/)
  assert.match(editorStyles, /grid-area:\s*frames/)
})
```

- [ ] **Step 2: Verify the contract fails**

```bash
node --test --test-name-pattern="layer rows and animation" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because the reference row and frame-panel classes are absent.

- [ ] **Step 3: Convert each layer into the reference row layout**

Use buttons for visibility, duplicate, and delete while retaining the current bindings:

```vue
<div
  v-for="(layer, index) in currentFrame.layers"
  :key="layer.id"
  class="pe-layer-item"
  :class="{ active: activeLayer === index }"
  @click="handleSelectLayer(index)"
>
  <button
    type="button"
    class="pe-layer-visibility"
    :title="layer.visible ? t('common.pxm_editor_hide_layer') : t('common.pxm_editor_show_layer')"
    @click.stop="layer.visible = !layer.visible; handleUpdateLayerSettings()"
  >
    <Eye v-if="layer.visible" :size="18" />
    <EyeOff v-else :size="18" />
  </button>
  <span class="pe-layer-name">{{ layer.name }}</span>
  <label class="pe-layer-opacity">
    <input :value="layerOpacityPercent(layer)" type="number" min="10" max="100" step="1" @click.stop @change="handleLayerOpacityPercent(layer, $event)" />
    <span>%</span>
  </label>
  <button type="button" class="pe-layer-copy" :title="t('common.pxm_editor_duplicate')" @click.stop="handleDuplicateLayer(index)"><Copy :size="17" /></button>
  <button type="button" class="pe-layer-delete" :disabled="currentFrame.layers.length <= 2" :title="t('common.pxm_editor_delete_layer')" @click.stop="handleDeleteLayer(index)"><Trash2 :size="17" /></button>
</div>
```

Import the existing `Layer` type from the core module, then implement percent conversion and duplication adjacent to `handleAddLayer`:

```ts
import type { Layer } from '@/modules/pixel-editor/core'

function layerOpacityPercent(layer: Layer): number {
  return Math.round(layer.opacity * 100)
}

function handleLayerOpacityPercent(layer: Layer, event: Event): void {
  const input = event.target as HTMLInputElement
  const percent = Math.max(10, Math.min(100, Number(input.value) || 100))
  layer.opacity = percent / 100
  input.value = String(percent)
  handleUpdateLayerSettings()
}

function handleDuplicateLayer(index: number): void {
  const source = currentFrame.value.layers[index]
  if (!source || currentFrame.value.layers.length >= 4) return
  snapshot()
  const duplicate = makeLayer(index + 1)
  duplicate.name = `${source.name} ${t('common.pxm_editor_copy_suffix')}`
  duplicate.visible = source.visible
  duplicate.opacity = source.opacity
  duplicate.pixels = [...source.pixels]
  duplicate.canvasPixels = { ...source.canvasPixels }
  currentFrame.value.layers.splice(index + 1, 0, duplicate)
  activeLayer.value = index + 1
  touchProject(t('common.pxm_editor_layer_duplicated'))
}
```

The repository already defines `pxm_editor_copy_suffix` in Chinese and English; ensure Japanese also defines it. Add `pxm_editor_layer_duplicated`, `pxm_editor_hide_layer`, and `pxm_editor_show_layer` to all three locale files using:

```ts
// zh-CN
pxm_editor_layer_duplicated: '图层已复制',
pxm_editor_hide_layer: '隐藏图层',
pxm_editor_show_layer: '显示图层',

// en-US
pxm_editor_layer_duplicated: 'Layer duplicated',
pxm_editor_hide_layer: 'Hide layer',
pxm_editor_show_layer: 'Show layer',

// ja
pxm_editor_copy_suffix: 'コピー',
pxm_editor_layer_duplicated: 'レイヤーを複製しました',
pxm_editor_hide_layer: 'レイヤーを非表示',
pxm_editor_show_layer: 'レイヤーを表示',
```

- [ ] **Step 4: Move frame controls and delay into one bottom panel**

Use:

```vue
<section class="pe-panel pe-frame-panel">
  <div class="pe-frame-controls">
    <strong>{{ t('common.pxm_editor_frames') }}</strong>
    <div class="pe-frame-actions">
      <button type="button" :title="t('common.pxm_editor_play_all_frames')" @click="handleTogglePreview">▶</button>
      <button type="button" :title="t('common.pxm_editor_add')" @click="handleAddFrame">＋</button>
      <button type="button" :title="t('common.pxm_editor_duplicate')" @click="handleDuplicateFrame"><Copy :size="17" /></button>
      <button type="button" :title="t('common.pxm_editor_delete')" @click="handleDeleteFrame"><Trash2 :size="17" /></button>
    </div>
    <label class="pe-frame-delay">
      <span>{{ t('common.pxm_editor_interval') }}</span>
      <input v-model="frameDelayInput" type="number" min="20" max="5000" step="10" @blur="handleCommitFrameDelay" @change="handleCommitFrameDelay" @keydown.enter="handleCommitFrameDelay" />
      <span>ms</span>
    </label>
  </div>
  <div class="pe-frames-list">
    <button
      v-for="(frame, index) in project.frames"
      :key="frame.id"
      type="button"
      class="pe-frame-item"
      :class="{
        active: currentFrameIndex === index,
        dragging: draggingFrameIndex === index,
        'drag-over': dragOverFrameIndex === index,
      }"
      draggable="true"
      @click="handleSelectFrame(index)"
      @dragstart="handleStartFrameDrag(index, $event)"
      @dragover.prevent="handleDragOverFrame(index, $event)"
      @dragleave="dragOverFrameIndex = null"
      @drop.prevent="handleDropFrame(index)"
      @dragend="handleEndFrameDrag"
    >
      <canvas :ref="(el) => setFrameThumbRef(frame.id, el)" width="96" height="48" />
      <strong>{{ t('common.pxm_editor_frame_prefix') }} {{ index + 1 }}</strong>
    </button>
  </div>
</section>
```

- [ ] **Step 5: Style layers and frames**

```scss
.pe-layer-item {
  display: grid;
  grid-template-columns: 28px minmax(70px, 1fr) 80px 28px 28px;
  align-items: center;
  gap: 6px;
  min-height: 54px;
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 8px;
}

.pe-layer-item.active {
  background: var(--pe-reference-selected);
  border-color: var(--pe-primary);
}

.pe-layer-opacity {
  display: grid;
  grid-template-columns: 1fr 20px;
  align-items: center;
  background: var(--pe-reference-control);
  border-radius: 8px;
  overflow: hidden;
}

.pe-frame-panel {
  grid-area: frames;
  min-width: 0;
  min-height: 133px;
  display: grid;
  grid-template-columns: 162px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
}

.pe-frame-controls {
  display: grid;
  align-content: start;
  gap: 10px;
}

.pe-frame-actions {
  display: grid;
  grid-template-columns: repeat(4, 36px);
  gap: 6px;
}

.pe-frame-item {
  flex: 0 0 170px;
  padding: 10px;
  background: #fff;
}

.pe-frame-item.active {
  background: var(--pe-reference-selected);
  border-color: var(--pe-primary);
}
```

- [ ] **Step 6: Run all targeted checks**

```bash
node --test tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/device-preview.test.ts
pnpm exec vue-tsc --noEmit
pnpm run build:qa
```

Expected: all commands exit 0.

- [ ] **Step 7: Manually verify layer and frame behavior**

- Add layers to the maximum, select each one, toggle visibility, change opacity, duplicate, and delete.
- Confirm duplicating copies `pixels` and `canvasPixels` without sharing references.
- Add, duplicate, reorder, and delete frames.
- Change delay using blur, change, and Enter.
- Start and stop frame playback.

- [ ] **Step 8: Commit the layers and frames slice**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss src/locales/zh-CN/common.ts src/locales/en-US/common.ts src/locales/ja/common.ts tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "feat: match reference layers and frames panels"
```

---

### Task 6: Restyle Import and Preserve Local LED Preview Access

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:512-598, 850-872, 3021-3210, 3252-3275`
- Modify: `src/modules/pixel-editor/styles/index.scss:659-740`

**Interfaces:**
- Consumes: `importDialog`, both import Canvas refs and pointer/wheel handlers, `handleApplyImportToLayer`, `previewCanvasRef`, `handleTogglePreview`, `previewPlaying`.
- Produces: Reference-styled import dialog and an on-demand local animation-preview popover so the existing preview Canvas remains accessible.

- [ ] **Step 1: Add failing import and local-preview contracts**

Append:

```ts
test('keeps import crop bindings and local preview Canvas accessible', () => {
  assert.match(editorSource, /role="dialog"/)
  assert.match(editorSource, /ref="importCropCanvasRef"/)
  assert.match(editorSource, /@wheel\.prevent="handleImportWheel"/)
  assert.match(editorSource, /@click="handleApplyImportToLayer"/)
  assert.match(editorSource, /class="pe-local-preview-popover"/)
  assert.match(editorSource, /ref="previewCanvasRef"/)
})
```

- [ ] **Step 2: Verify the contract fails**

```bash
node --test --test-name-pattern="local preview Canvas" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because dialog semantics and the on-demand preview class are absent.

- [ ] **Step 3: Add dialog semantics and reference structure**

Change the modal root to:

```vue
<div v-if="importDialog.open" class="pe-modal-backdrop" @click.self="handleCloseImportDialog">
  <section class="pe-modal" role="dialog" aria-modal="true" :aria-label="t('common.pxm_editor_import_image_pixelated')">
```

Keep the full current cropper, zoom, fit, dither, preview, cancel, and apply controls. Do not rename or replace these bindings:

```vue
ref="importCropCanvasRef"
@pointerdown="handleImportPointerDown"
@pointermove="handleImportPointerMove"
@pointerup="handleImportPointerUp"
@pointercancel="handleImportPointerUp"
@wheel.prevent="handleImportWheel"
ref="importCanvasRef"
@click="handleApplyImportToLayer"
```

- [ ] **Step 4: Preserve the local LED preview as an on-demand popover**

Place this beside the frame panel and show it only while local playback is active:

```vue
<section v-if="previewPlaying" class="pe-local-preview-popover" aria-live="polite">
  <div class="pe-panel-title-row">
    <strong>{{ t('common.pxm_editor_led_preview') }}</strong>
    <button type="button" :title="t('common.pxm_editor_stop_play')" @click="handleTogglePreview">×</button>
  </div>
  <canvas ref="previewCanvasRef" width="480" height="240" />
</section>
```

This preserves the existing local preview Canvas without occupying permanent space that is absent from the reference layout. The header Preview button remains device preview; the frame Play button remains local animation preview.

- [ ] **Step 5: Restyle the import dialog and popover**

```scss
.pe-modal-backdrop {
  z-index: 40;
  background: rgba(16, 24, 38, 0.42);
}

.pe-modal {
  width: min(980px, calc(100vw - 40px));
  padding: 16px;
  background: #fff;
  border: 1px solid var(--pe-reference-border);
  border-radius: var(--pe-panel-radius);
  box-shadow: 0 18px 48px rgba(30, 42, 60, 0.18);
}

.pe-local-preview-popover {
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 30;
  width: min(420px, calc(100vw - 28px));
  padding: 12px;
  background: #fff;
  border: 1px solid var(--pe-reference-border);
  border-radius: var(--pe-panel-radius);
  box-shadow: 0 18px 48px rgba(30, 42, 60, 0.18);
}

.pe-local-preview-popover canvas {
  width: 100%;
  height: auto;
  aspect-ratio: 2 / 1;
  background: var(--pe-canvas-bg);
  border-radius: 6px;
}
```

- [ ] **Step 6: Run targeted checks**

```bash
node --test tests/modules/pixel-editor/editor-ui-contract.test.ts tests/lib/images/rgb.test.ts
pnpm exec vue-tsc --noEmit
pnpm run build:qa
```

Expected: all commands exit 0.

- [ ] **Step 7: Manually verify import and preview failure boundaries**

- Open Static import and cancel the file chooser; the project remains unchanged.
- Open a valid PNG/JPEG/WebP; drag, zoom, change fit/dither, cancel the dialog, and confirm the project remains unchanged.
- Reopen and apply; confirm only the active layer changes.
- Import a GIF and confirm frames are inserted after the current frame.
- Start local playback and confirm the preview popover appears and closes on stop.
- Trigger device Preview with dirty content and confirm save occurs before transmission.

- [ ] **Step 8: Commit the import and preview slice**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "feat: align pixel editor import and preview UI"
```

---

### Task 7: Add Desktop Breakpoints, Overflow Rules, and Accessibility Contracts

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:1-599`
- Modify: `src/modules/pixel-editor/styles/index.scss:742-776`

**Interfaces:**
- Consumes: all new region classes and existing localized titles.
- Produces: 1280 px full layout, 1024–1279 px compressed layout, below-1024 minimum-width overflow behavior, accessible names for icon-only controls.

- [ ] **Step 1: Add failing responsive and accessibility contracts**

Append:

```ts
test('defines the accepted desktop responsive contract', () => {
  assert.match(editorStyles, /@media \(max-width:\s*1279px\)/)
  assert.match(editorStyles, /@media \(max-width:\s*1023px\)/)
  assert.match(editorStyles, /min-width:\s*1024px/)
  assert.match(editorStyles, /overflow-x:\s*auto/)
})

test('gives icon-only controls accessible labels', () => {
  const iconButtonTags = editorSource.match(
    /<button\b[^>]*class="[^"]*(?:pe-icon-tool|pe-layer-visibility|pe-layer-copy|pe-layer-delete)[^"]*"[^>]*>/g
  ) || []
  assert.ok(iconButtonTags.length > 0)
  for (const tag of iconButtonTags) {
    assert.match(tag, /(?::aria-label|aria-label)=/)
  }
})
```

- [ ] **Step 2: Verify the responsive case fails**

```bash
node --test --test-name-pattern="desktop responsive contract" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because the accepted breakpoints are not yet defined.

- [ ] **Step 3: Replace the old mobile-stacking breakpoints**

```scss
@media (max-width: 1279px) {
  .pe-editor-grid {
    grid-template-columns: var(--pe-side-panel-width) minmax(440px, 1fr) var(--pe-side-panel-width);
  }

  .pe-editor-nav {
    grid-template-columns: minmax(190px, 1fr) auto minmax(340px, 1fr);
  }
}

@media (max-width: 1023px) {
  .pe-app-shell,
  .pe-editor-scroll {
    min-width: 1024px;
  }

  .fullscreen-layout {
    overflow-x: auto;
  }
}
```

Remove the old `780px` single-column editor rules because they conflict with the accepted desktop-first contract. Keep unrelated library/project-card rules only if they are still rendered elsewhere.

- [ ] **Step 4: Add accessible labels to every icon-only button**

For each icon-only button, provide both localized `:title` and `:aria-label` using the same key:

```vue
<button
  type="button"
  class="pe-icon-tool"
  :title="t('common.pxm_editor_undo')"
  :aria-label="t('common.pxm_editor_undo')"
  @click="handleUndo"
>
  <Undo2 :size="18" aria-hidden="true" />
</button>
```

Apply the same pattern to tool, layer, frame, close, back, duplicate, delete, visibility, and playback icons.

- [ ] **Step 5: Run the entire repository verification set**

```bash
node --test tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/device-preview.test.ts tests/lib/images/rgb.test.ts
pnpm exec vue-tsc --noEmit
pnpm run build:qa
```

Expected: all commands exit 0.

- [ ] **Step 6: Run locale and viewport manual checks**

At 1440 × 754 and 1920 × 1080 in Chinese, English, and Japanese:

- Header actions do not overlap counts or title.
- Tools panel remains independently scrollable.
- Canvas and layer panels remain aligned.
- Frame panel spans center and right columns.
- No label is clipped beyond its control without a tooltip.

At 1023 px width:

- The editor keeps a 1024 px minimum surface.
- Horizontal scrolling exposes all three columns.
- Canvas pointer coordinates remain correct after horizontal scrolling.

- [ ] **Step 7: Commit the responsive and accessibility slice**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "fix: harden pixel editor responsive accessibility"
```

---

### Task 8: Complete Visual and Functional Regression Verification

**Files:**
- Modify only if verification exposes a defect:
  - `src/modules/pixel-editor/components/editor/PixelEditor.vue`
  - `src/modules/pixel-editor/styles/index.scss`
  - `tests/modules/pixel-editor/editor-ui-contract.test.ts`

**Interfaces:**
- Consumes: completed reference editor UI.
- Produces: fresh verification evidence for behavior preservation and reference fidelity.

- [ ] **Step 1: Run all automated checks from a clean process**

```bash
node --test tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/device-preview.test.ts tests/lib/images/rgb.test.ts
pnpm exec vue-tsc --noEmit
pnpm run build:qa
```

Expected: every command exits 0 with no failed test or TypeScript diagnostic.

- [ ] **Step 2: Compare the five major regions against the live reference**

At 1440 × 754 verify:

- Header height is 57 px.
- Workspace padding and gaps are 14 px.
- Left and right panels are 260 px.
- White panels use `#e1e6ec` borders and 8 px radii.
- Canvas is near-black with dark grid lines.
- Selected controls and selected frame/layer use pale green.
- Save is the visually dominant near-black action.
- Import and Export expose the same two-item menu structure as the live reference.

- [ ] **Step 3: Execute the drawing regression matrix**

For each drawing tool, make a visible edit and undo it:

- Brush drag.
- Eraser drag.
- Fill.
- Picker.
- Rectangle and ellipse.
- Selection and move.
- Magic selection.
- Linear and radial gradient.
- Pixel text left, center, and right alignment.

Expected: every edit affects the intended logical pixels, updates the current frame thumbnail, and is reversible by Undo/Redo.

- [ ] **Step 4: Execute the project regression matrix**

- Add/select/hide/change opacity/duplicate/delete layers.
- Add/select/reorder/duplicate/delete frames.
- Change frame delay.
- Play and stop local animation preview.
- Import static and animated images.
- Export PNG and GIF.
- Save a new work.
- Load and update an existing work.
- Preview dirty work to a selected device and confirm save occurs first.

Expected: behavior matches the pre-redesign editor, with the new control locations only.

- [ ] **Step 5: Inspect the final diff for forbidden scope expansion**

Run:

```bash
git diff --stat HEAD~7..HEAD
git diff HEAD~7..HEAD -- src/modules/pixel-editor/core src/api src/lib/images
```

Expected: the first command shows the intended Vue, SCSS, locale, and test changes. The second command is empty because rendering core, API, and image libraries were not changed.

- [ ] **Step 6: Commit verification fixes only when required**

If verification required a source correction, stage only the files changed by that correction and commit:

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "fix: resolve pixel editor reference UI regressions"
```

If no correction was required, do not create an empty commit.

---

## Completion Evidence

The implementation is complete only when all of the following are recorded in the final handoff:

- Exact automated commands run and their exit status.
- 1440 × 754 and 1920 × 1080 visual comparison results.
- Canvas coordinate verification results at 100%, 200%, 400%, and 800%.
- Static and animated import results.
- PNG and GIF export results.
- New-work save and existing-work update results.
- Dirty-save-before-preview result.
- Any known visual deviation from the live Creator Center editor, with its functional reason.
