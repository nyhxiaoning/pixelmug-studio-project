# Pixel Editor Responsive Workspace Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Canvas/Layers row and Frames row fill the editor viewport without document vertical scrolling at heights of 700px or more, while aligning the Frames bottom edge with the Tools bottom edge.

**Architecture:** Turn `.pe-editor-scroll` into a fixed-height desktop workspace below the navigation. Let `.pe-editor-grid` divide that height between a flexible Canvas/Layers row and a clamped Frames row, while preserving each panel's existing local overflow owner. Restore the existing document-flow layout below 700px.

**Tech Stack:** SCSS, Node contract tests, Vite QA build, in-app browser QA.

## Global Constraints

- At viewport height >=700px, the document must not scroll vertically.
- At viewport height >=700px, Frames-bottom must equal Tools-bottom.
- Canvas zoom overflow stays inside `.pe-canvas-viewport`.
- Layers overflow stays inside `.pe-layers-panel`.
- Frames remain horizontally scrollable inside `.pe-frames-list`.
- At viewport height <700px, document vertical scrolling is allowed and the 526px first row is restored.
- Do not modify `PixelEditor.vue` or stage the user's existing frame-panel working-tree change.

---

### Task 1: Lock and Implement the Desktop Height Contract

**Files:**
- Modify: `src/modules/pixel-editor/styles/index.scss`
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`

**Interfaces:**
- Consumes: `.pe-editor-scroll`, `.pe-editor-grid`, `.pe-canvas-panel`, `.pe-layers-panel`, `.pe-frame-panel`.
- Produces: a fixed desktop workspace and a 699px document-flow fallback.

- [ ] **Step 1: Add one failing layout contract**

Extract the relevant CSS blocks and assert:

```ts
assert.match(editorScrollStyle, /height:\s*calc\(100vh - var\(--pe-nav-height\)\)/)
assert.match(editorScrollStyle, /min-height:\s*0/)
assert.match(editorScrollStyle, /overflow:\s*hidden/)
assert.match(editorGridStyle, /height:\s*100%/)
assert.match(editorGridStyle, /min-height:\s*0/)
assert.match(editorGridStyle, /grid-template-rows:\s*minmax\(0,\s*1fr\) clamp\(144px,\s*22vh,\s*170px\)/)
assert.match(canvasPanelStyle, /min-height:\s*0/)
assert.match(layersPanelStyle, /min-height:\s*0/)
assert.match(framePanelStyle, /min-height:\s*0/)
```

Also preserve assertions for Canvas viewport `overflow:auto`, Layers `overflow:auto`, and Frames-list `overflow-x:auto; overflow-y:hidden`.

- [ ] **Step 2: Run RED**

Run the new test in `tests/modules/pixel-editor/editor-ui-contract.test.ts`.

Expected: FAIL against the current `526px auto` grid and 526px panel minimum heights.

- [ ] **Step 3: Add the desktop workspace rules**

```scss
.pe-editor-scroll {
  height: calc(100vh - var(--pe-nav-height));
  min-height: 0;
  overflow: hidden;
}

.pe-editor-grid {
  height: 100%;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr) clamp(144px, 22vh, 170px);
}

.pe-canvas-panel,
.pe-layers-panel,
.pe-frame-panel {
  min-height: 0;
}

.pe-frame-panel {
  overflow: hidden;
}
```

- [ ] **Step 4: Add the short-height fallback**

Inside the existing `@media (max-height: 699px)` block add:

```scss
.pe-editor-scroll {
  height: auto;
  overflow: visible;
}

.pe-editor-grid {
  height: auto;
  grid-template-rows: 526px auto;
}

.pe-canvas-panel,
.pe-layers-panel {
  min-height: 526px;
}

.pe-frame-panel {
  overflow: visible;
}
```

- [ ] **Step 5: Run GREEN and static verification**

Run the targeted contract, `pnpm run build:qa`, and `git diff --check`.

Expected: targeted contract passes and the QA build succeeds.

---

### Task 2: Browser Verify Desktop Alignment and Short-Height Flow

**Files:**
- Modify the SCSS/test only if measured geometry contradicts the approved design.

**Interfaces:**
- Consumes: Task 1 workspace rules.
- Produces: measured evidence for scroll ownership and bottom alignment.

- [ ] **Step 1: Verify 1440×754**

Require `document.scrollHeight === document.clientHeight`, `.pe-editor-scroll` height equal to `754px - nav height`, and absolute difference between Frames-bottom and Tools-bottom <=1px.

- [ ] **Step 2: Verify panel geometry and overflow**

Require Canvas-bottom and Layers-bottom to match; Canvas viewport and Layers panel remain locally scrollable. Set Canvas to 300% and verify the document height and Frames/Tools bottom alignment do not change.

- [ ] **Step 3: Verify 1440×680 fallback**

Require `document.scrollHeight > document.clientHeight`, grid first-row computed height 526px, and Canvas/Layers rendered heights >=526px.

- [ ] **Step 4: Clean, review, and commit**

Remove QA harness, run the targeted contract/build/diff check, stage only `index.scss` and the contract test, and commit as `feat: make editor workspace height responsive`.

