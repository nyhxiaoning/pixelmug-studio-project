# Pixel Editor Frame Controls Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the current-frame interval label and input on one line and visually center the four animation-frame action icons inside their existing buttons.

**Architecture:** Make a local SCSS-only presentation change in the frame-controls component. The Vue template and all behavior bindings remain untouched; a source-level UI contract locks the approved grid and icon-centering properties.

**Tech Stack:** Vue 3 template, SCSS, Node.js `node:test`, Vite QA build

## Global Constraints

- Keep `.pe-frame-panel` sizing and responsive breakpoints unchanged.
- Keep frame action buttons at `34 × 34px` and Lucide icons at `17px`.
- Do not change global button or SVG styles.
- Do not use `transform`, relative offsets, or hard-coded vertical translations.
- Preserve all button handlers, disabled states, titles, and ARIA labels.

---

### Task 1: Align frame interval and action icons

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/styles/index.scss`
- Verify: `src/modules/pixel-editor/components/editor/PixelEditor.vue`

**Interfaces:**
- Consumes: Existing `.pe-frame-delay`, `.pe-frame-delay-input`, `.pe-frame-action`, and Lucide SVG elements.
- Produces: A two-column one-line interval control and locally centered frame-action icons.

- [ ] **Step 1: Add one failing UI contract**

Add a test that extracts the relevant CSS blocks and frame-controls template:

```ts
test('aligns the frame interval and action icons without changing behavior', () => {
  const frameDelayStyle = extractCssBlock(editorStyles, '.pe-frame-delay')
  const frameDelayInputStyle = extractCssBlock(editorStyles, '.pe-frame-delay-input')
  const frameActionStyle = extractCssBlock(editorStyles, '.pe-frame-action')
  const frameActionIconStyle = extractCssBlock(editorStyles, '.pe-frame-action > svg')
  const frameControls = editorSource.match(
    /<div class="pe-frame-controls">[\s\S]*?<div class="pe-frame-content">/
  )?.[0]

  assert.match(frameDelayStyle, /grid-template-columns:\s*auto minmax\(0,\s*1fr\)\s*;/)
  assert.match(frameDelayStyle, /align-items:\s*center/)
  assert.match(frameDelayInputStyle, /min-width:\s*0/)
  assert.match(frameDelayInputStyle, /align-items:\s*center/)
  assert.match(frameActionStyle, /display:\s*inline-flex/)
  assert.match(frameActionStyle, /align-items:\s*center/)
  assert.match(frameActionStyle, /justify-content:\s*center/)
  assert.match(frameActionStyle, /line-height:\s*0/)
  assert.doesNotMatch(frameActionStyle, /transform|translate|top\s*:|bottom\s*:/)
  assert.match(frameActionIconStyle, /display:\s*block/)
  assert.match(frameActionIconStyle, /flex:\s*0 0 auto/)
  assert.ok(frameControls)
  assert.match(frameControls, /@click="handleTogglePreview"/)
  assert.match(frameControls, /@click="handleAddFrame"/)
  assert.match(frameControls, /@click="handleDuplicateFrame"/)
  assert.match(frameControls, /@click="handleDeleteFrame"/)
})
```

- [ ] **Step 2: Run the targeted test and verify RED**

```bash
node --test --test-name-pattern="frame interval and action icons" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because the delay is currently a one-column grid and the action button uses inline-grid without a direct SVG rule.

- [ ] **Step 3: Apply the minimal local SCSS change**

Use:

```scss
.pe-frame-action {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  padding: 0;
  border: 1px solid var(--pe-line);
  border-radius: 7px;
  background: var(--pe-control-bg);
  color: var(--pe-text);
}

.pe-frame-action > svg {
  display: block;
  flex: 0 0 auto;
}

.pe-frame-delay {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  color: var(--pe-muted);
  font-size: 12px;
}

.pe-frame-delay-input {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
}
```

- [ ] **Step 4: Run targeted and neighboring contracts**

```bash
node --test --test-name-pattern="frame interval and action icons|complete frame thumbnails|desktop editor viewport" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: all selected tests PASS.

- [ ] **Step 5: Run static verification**

```bash
pnpm exec eslint tests/modules/pixel-editor/editor-ui-contract.test.ts
pnpm run build:qa
git diff --check
```

Expected: all commands succeed; existing Browserslist and chunk-size warnings are acceptable.

- [ ] **Step 6: Verify the live UI**

At `1440 × 700` and `1440 × 699`, verify:

- the delay label, input, and `ms` share one line;
- the control stays inside its `162px` column;
- all four SVG centers match their button centers on both axes;
- document-scroll behavior remains unchanged at the breakpoint.

- [ ] **Step 7: Commit**

```bash
git add src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "style: align frame controls"
```

## Self-Review

- Spec coverage: one-line delay, shrink safety, local icon centering, unchanged behavior, and responsive verification are covered.
- Placeholder scan: no deferred work or vague test steps remain.
- Type consistency: no runtime types or component interfaces are introduced.
