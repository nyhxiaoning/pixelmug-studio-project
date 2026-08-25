# Pixel Editor Compact Color Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the drawing section’s labeled color controls with one compact row containing a flexible hexadecimal input followed by a fixed 24px native color swatch.

**Architecture:** Keep `currentColor` as the single source of truth and preserve the native color input. Change only the drawing-section template and `.pe-color-row`-scoped styles, with a source contract that locks the observable control order, accessibility labels, binding, and compact dimensions.

**Tech Stack:** Vue 3 SFC template, SCSS, Node.js built-in test runner.

## Global Constraints

- Do not add brush opacity behavior.
- Do not change drawing handlers, tool button sizes, or any other toolbar group.
- Keep both controls bound to `currentColor`.
- The hexadecimal input appears first and the color swatch second.
- The swatch is exactly 24px by 24px and the row remains on one line.

---

### Task 1: Compact Drawing Color Row

**Files:**
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:212-216`
- Modify: `src/modules/pixel-editor/styles/index.scss:583-620`
- Test: `tests/modules/pixel-editor/editor-ui-contract.test.ts`

**Interfaces:**
- Consumes: Vue ref `currentColor: Ref<string>` and i18n key `common.pxm_editor_color`.
- Produces: `.pe-color-row` containing `.pe-hex-input` followed by `input.pe-color-swatch[type="color"]`.

- [ ] **Step 1: Write the failing color-row contract**

Add one focused test that extracts the `.pe-color-row` template and its two scoped SCSS blocks, then asserts:

```ts
test('shows the drawing color value and swatch in one compact row', () => {
  const colorRow = editorSource.match(
    /<div\s+class="pe-control-row pe-color-row">[\s\S]*?<\/div>/
  )?.[0]

  assert.ok(colorRow)
  const hexIndex = colorRow.indexOf('class="pe-hex-input"')
  const swatchIndex = colorRow.indexOf('class="pe-color-swatch"')

  assert.ok(hexIndex >= 0 && swatchIndex > hexIndex)
  assert.equal((colorRow.match(/v-model="currentColor"/g) || []).length, 2)
  assert.match(colorRow, /class="pe-hex-input"[\s\S]*maxlength="7"/)
  assert.match(colorRow, /class="pe-color-swatch"[\s\S]*type="color"/)
  assert.equal((colorRow.match(/:aria-label="t\('common\.pxm_editor_color'\)"/g) || []).length, 2)
  assert.doesNotMatch(colorRow, /<label/)

  const rowStyle = extractCssBlock(editorStyles, '.pe-color-row')
  const hexStyle = extractCssBlock(editorStyles, '.pe-color-row .pe-hex-input')
  const swatchStyle = extractCssBlock(editorStyles, '.pe-color-row .pe-color-swatch')

  assert.match(rowStyle, /display:\s*flex/)
  assert.match(rowStyle, /flex-wrap:\s*nowrap/)
  assert.match(hexStyle, /flex:\s*1 1 auto/)
  assert.match(hexStyle, /width:\s*auto/)
  assert.match(swatchStyle, /width:\s*24px/)
  assert.match(swatchStyle, /height:\s*24px/)
  assert.match(swatchStyle, /flex:\s*0 0 24px/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test --test-name-pattern="drawing color value and swatch" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because `.pe-color-swatch`, the approved order, and the scoped compact styles do not exist.

- [ ] **Step 3: Implement the minimal Vue template**

Replace the existing labeled row with:

```vue
<div class="pe-control-row pe-color-row">
  <input
    v-model="currentColor"
    class="pe-hex-input"
    maxlength="7"
    :aria-label="t('common.pxm_editor_color')"
  >
  <input
    v-model="currentColor"
    class="pe-color-swatch"
    type="color"
    :aria-label="t('common.pxm_editor_color')"
  >
</div>
```

- [ ] **Step 4: Implement the minimal scoped SCSS**

Add or replace only these color-row rules:

```scss
.pe-color-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
}

.pe-color-row .pe-hex-input {
  width: auto;
  flex: 1 1 auto !important;
}

.pe-color-row .pe-color-swatch {
  width: 24px;
  height: 24px;
  min-width: 24px;
  flex: 0 0 24px;
  padding: 0;
  border: 1px solid var(--pe-line);
  border-radius: 4px;
  background: transparent;
}
```

- [ ] **Step 5: Run focused and adjacent contracts**

Run:

```bash
node --test --test-name-pattern="drawing color value and swatch|left toolbar compact|distributes toolbar groups" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: all selected tests PASS.

- [ ] **Step 6: Run static and build verification**

Run:

```bash
pnpm exec eslint tests/modules/pixel-editor/editor-ui-contract.test.ts
pnpm run build:qa
git diff --check
```

Expected: all commands exit successfully; only existing Browserslist or chunk-size build warnings are acceptable.

- [ ] **Step 7: Browser-check the compact row**

At `http://127.0.0.1:3037/#/pixel-editor`, verify the hexadecimal input appears first, the 24px swatch appears second, both remain on one line, changing either updates the other, and the tools panel does not gain a new scrollbar.

- [ ] **Step 8: Commit the implementation**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "style: compact pixel editor color row"
```
