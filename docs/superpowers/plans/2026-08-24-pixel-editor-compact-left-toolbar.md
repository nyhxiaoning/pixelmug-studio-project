# Pixel Editor Compact Left Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fit every existing left-toolbar control without an internal scrollbar at 1440×754 while standardizing toolbar text to 12px, shrinking all toolbar icons, making Selection five columns, and rendering pixel text as one horizontally scrollable line.

**Architecture:** Preserve the current `PixelEditor.vue` handlers and group order. Apply toolbar-scoped compact styles in `index.scss`, add only the textarea attributes needed for reliable single-line overflow, and retain a max-height fallback that restores vertical scrolling below 700px.

**Tech Stack:** Vue 3, TypeScript template, SCSS, Node contract tests, Vite QA build, in-app browser QA.

## Global Constraints

- Scope all visual changes to `.pe-tools-panel`.
- Use 12px for all toolbar text without flattening existing font weights.
- Shrink every left-toolbar SVG icon to 15px and compact icon buttons to 32px.
- Render the 13 Selection actions in five equal columns.
- Keep pixel text on one visual line with horizontal, not vertical, overflow.
- At 1440×754, require `scrollHeight <= clientHeight` and no visible toolbar scrollbar.
- Below 700px viewport height, restore vertical toolbar scrolling so no controls are clipped.
- Preserve every existing click/change/input binding and add no dependencies.

---

### Task 1: Lock and Implement the Compact Toolbar Contract

**Files:**
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue`
- Modify: `src/modules/pixel-editor/styles/index.scss`
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`

**Interfaces:**
- Consumes: existing `.pe-tools-panel`, `.pe-tool-section--selection`, `.pe-tool-section--text`, `.pe-icon-tool`, and `textTool.text` binding.
- Produces: compact toolbar CSS contract and a single-line `textarea` with `rows="1"` and `wrap="off"`.

- [ ] **Step 1: Add one failing contract test**

Extract the toolbar, Selection, text-input, and max-height CSS blocks and assert:

```ts
assert.match(editorStyles, /\.pe-tools-panel\s*\{[^}]*font-size:\s*12px/s)
assert.match(editorStyles, /\.pe-tools-panel \.pe-icon-tool svg\s*\{[^}]*width:\s*15px[^}]*height:\s*15px/s)
assert.match(editorStyles, /\.pe-tools-panel \.pe-icon-tool\s*\{[^}]*min-height:\s*32px/s)
assert.match(editorStyles, /\.pe-tool-section--selection \.pe-tool-grid\s*\{[^}]*repeat\(5,/s)
assert.match(textareaTag, /rows="1"/)
assert.match(textareaTag, /wrap="off"/)
assert.match(textStyle, /white-space:\s*nowrap/)
assert.match(textStyle, /overflow-x:\s*auto/)
assert.match(textStyle, /overflow-y:\s*hidden/)
assert.match(textStyle, /resize:\s*none/)
assert.match(editorStyles, /@media \(max-height:\s*699px\)[\s\S]*\.pe-tools-panel\s*\{[^}]*overflow-y:\s*auto/)
```

Also assert the toolbar still contains the existing drawing, shape, selection, onion, text, and footer groups in that order.

- [ ] **Step 2: Run RED**

Run `node --test tests/modules/pixel-editor/editor-ui-contract.test.ts`.

Expected: the compact-toolbar test fails against the current 14px/13px typography, three-column Selection grid, 18px icons, and three-row resizable textarea.

- [ ] **Step 3: Make the textarea reliably single-line**

Change only the existing textarea attributes:

```vue
<textarea v-model="textTool.text" rows="1" wrap="off" />
```

Do not change `v-model` or any text-stamping handlers.

- [ ] **Step 4: Add toolbar-scoped compact CSS**

Implement the following exact behavior, adjusting only spacing if browser measurement requires it:

```scss
.pe-tools-panel {
  font-size: 12px;
  overflow: hidden;
}

.pe-tools-panel .pe-tool-section {
  padding: 7px 10px;
}

.pe-tools-panel .pe-tool-section h2,
.pe-tools-panel button,
.pe-tools-panel input,
.pe-tools-panel select,
.pe-tools-panel textarea,
.pe-tools-panel label,
.pe-tools-panel span {
  font-size: 12px;
}

.pe-tools-panel .pe-tool-section h2 {
  margin-bottom: 5px;
}

.pe-tools-panel .pe-icon-tool {
  min-height: 32px;
}

.pe-tools-panel .pe-icon-tool svg {
  width: 15px;
  height: 15px;
}

.pe-tool-section--selection .pe-tool-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.pe-tool-section--text textarea {
  height: 32px;
  min-height: 32px;
  max-height: 32px;
  resize: none;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

@media (max-height: 699px) {
  .pe-tools-panel {
    overflow-y: auto;
  }
}
```

Reduce `.pe-control-row` and toolbar grid gaps/margins within the toolbar only if needed to meet the measured 754px fit.

- [ ] **Step 5: Run GREEN and static verification**

Run `node --test tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/device-preview.test.ts`, `pnpm run build:qa`, and `git diff --check`.

Expected: all contract tests pass, QA build succeeds, and the diff is clean.

- [ ] **Step 6: Commit after browser QA**

Do not commit until Task 2 proves the real height contract.

---

### Task 2: Browser Measure and Tune the Height Contract

**Files:**
- Modify: `src/modules/pixel-editor/styles/index.scss` only if measured spacing needs further reduction.
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts` when a tuning rule becomes part of the contract.

**Interfaces:**
- Consumes: Task 1 compact toolbar.
- Produces: measured evidence at normal and short viewport heights.

- [ ] **Step 1: Open the editor at 1440×754**

Navigate to `http://localhost:3037/#/pixel-editor` and record `.pe-tools-panel` client height, scroll height, overflow values, font sizes, icon box size, Selection grid column count, and textarea overflow dimensions.

- [ ] **Step 2: Verify the normal-height contract**

Require:

```text
toolbar.scrollHeight <= toolbar.clientHeight
computed overflow-y = hidden
toolbar text = 12px
toolbar SVG = 15px × 15px
Selection grid = 5 columns
textarea clientHeight = 32px
textarea scrollWidth > clientWidth for a deliberately long value
textarea scrollHeight <= clientHeight
```

Every toolbar section, including Export, must remain visible inside the panel.

- [ ] **Step 3: Tune only if measurement fails**

Prefer reducing toolbar-local section padding, row margin, row gap, and button height before hiding or removing any feature. Add a corresponding contract assertion for every new tuning rule.

- [ ] **Step 4: Verify the short-height fallback**

At 1440×680, require computed `overflow-y: auto`, `scrollHeight > clientHeight`, and successful scrolling to the Export controls.

- [ ] **Step 5: Final regression and commit**

Remove any temporary QA harness, rerun all target tests and `pnpm run build:qa`, run `git diff --check`, then commit the three product/test files as `feat: compact pixel editor toolbar`.

