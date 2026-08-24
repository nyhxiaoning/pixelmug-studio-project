# Pixel Editor Text Alignment Button Padding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce only the vertical padding of the Pixel Text Left, Center, and Right buttons from 8px to 4px while preserving their equal widths and behavior.

**Architecture:** Add one toolbar-scoped SCSS selector beneath the existing three-column button-row rule. Lock the scope and exact padding in the existing editor UI contract, then verify the rendered three-button geometry in the local editor.

**Tech Stack:** SCSS, Node contract tests, Vite QA build, in-app browser QA.

## Global Constraints

- Change only `.pe-tool-section--text .pe-button-row--three .pe-secondary`.
- Use `padding: 4px 11px`.
- Preserve the three equal grid columns and current gap.
- Preserve 12px text, colors, radius, focus behavior, and all three `handleStampText` bindings.
- Do not stage or commit the user's existing frame-panel change.

---

### Task 1: Add the Scoped Padding Rule with TDD

**Files:**
- Modify: `src/modules/pixel-editor/styles/index.scss`
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`

**Interfaces:**
- Consumes: `.pe-tool-section--text`, `.pe-button-row--three`, `.pe-secondary`.
- Produces: a scoped `padding: 4px 11px` rule.

- [ ] **Step 1: Add a failing contract assertion**

```ts
const textAlignmentButtonStyle = extractCssBlock(
  editorStyles,
  '.pe-tool-section--text .pe-button-row--three .pe-secondary'
)
assert.match(textAlignmentButtonStyle, /padding:\s*4px 11px/)
assert.doesNotMatch(textAlignmentButtonStyle, /width\s*:|grid-template-columns/)
assert.match(editorSource, /@click="handleStampText\(0\)"/)
assert.match(editorSource, /@click="handleStampText\(1\)"/)
assert.match(editorSource, /@click="handleStampText\(2\)"/)
```

- [ ] **Step 2: Run RED**

Run `node --test --test-name-pattern="left toolbar compact|text alignment" tests/modules/pixel-editor/editor-ui-contract.test.ts`.

Expected: the new assertion fails because the scoped rule is missing.

- [ ] **Step 3: Add the minimal SCSS**

```scss
.pe-tool-section--text .pe-button-row--three .pe-secondary {
  padding: 4px 11px;
}
```

- [ ] **Step 4: Run GREEN and build**

Run the same targeted test, `pnpm run build:qa`, and `git diff --check`.

Expected: targeted contract passes and the QA build succeeds.

---

### Task 2: Browser Geometry Verification and Commit

**Files:**
- Modify only if browser geometry contradicts the approved design.

**Interfaces:**
- Consumes: the scoped rule from Task 1.
- Produces: rendered evidence for equal widths and reduced height.

- [ ] **Step 1: Open the editor at 1440×754**

Use the local 3037 login/editor flow and locate the three Pixel Text alignment buttons.

- [ ] **Step 2: Measure all three buttons**

Require identical rendered widths, identical rendered heights, computed `padding-top` and `padding-bottom` of 4px, and computed horizontal padding of 11px.

- [ ] **Step 3: Recheck toolbar fit**

Require `.pe-tools-panel.scrollHeight <= .pe-tools-panel.clientHeight` at 1440×754.

- [ ] **Step 4: Clean and commit**

Remove any QA harness. Partially stage only the SCSS/test changes from this task, leaving the existing frame-panel working-tree change untouched. Commit as `style: compact pixel text alignment buttons`.

