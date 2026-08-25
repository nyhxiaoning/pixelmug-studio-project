# Pixel Editor Compact Layer Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase visible layer-title width by compacting right-panel text, action icons, and opacity controls without changing layer behavior.

**Architecture:** Keep the Vue template and layer state logic unchanged. Reallocate the existing five-column layer row in SCSS, use locally scoped selectors that beat the global button reset, and lock the resulting dimensions and one-line title behavior with a source-level UI contract.

**Tech Stack:** Vue 3 template, SCSS grid, Node.js `node:test`, Vite QA build

## Global Constraints

- Layer-panel text in scope is exactly `12px`.
- Layer row columns are exactly `24px minmax(0, 1fr) 58px 24px 24px` with `4px` gaps.
- Layer action buttons are `24 × 24px`; direct SVG children are `14 × 14px`.
- Opacity group width is `58px`; numeric input height is `28px`.
- Keep layer names single-line with ellipsis and preserve full `title`/ARIA values.
- Preserve all handlers, disabled states, pressed state, and opacity validation.
- Do not change the panel width, layer count limit, overview, or runtime logic.

---

### Task 1: Compact layer rows and preserve title space

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/styles/index.scss`
- Verify: `src/modules/pixel-editor/components/editor/PixelEditor.vue`

**Interfaces:**
- Consumes: Existing `.pe-layer-item`, `.pe-layer-select`, `.pe-layer-opacity`, `.pe-layer-visibility`, and `.pe-layer-action` elements.
- Produces: Compact five-column rows with wider title allocation and unchanged layer actions.

- [ ] **Step 1: Add one failing compact-layer presentation contract**

Add a test that extracts the exact CSS blocks and layer-row template:

```ts
test('prioritizes one-line layer titles with compact controls', () => {
  const layerItemStyle = extractCssBlock(editorStyles, '.pe-layer-item')
  const layerSelectStyle = extractCssBlock(editorStyles, '.pe-app-shell .pe-layer-select')
  const layerOpacityStyle = extractCssBlock(editorStyles, '.pe-layer-opacity')
  const layerOpacityInputStyle = extractCssBlock(editorStyles, '.pe-layer-opacity input')
  const layerActionStyle = extractCssBlock(
    editorStyles,
    '.pe-app-shell .pe-layer-visibility,'
  )
  const layerIconStyle = extractCssBlock(
    editorStyles,
    '.pe-layer-visibility svg,'
  )
  const layerTitleStyle = extractCssBlock(
    editorStyles,
    '.pe-layers-panel .pe-panel-title-row h2,'
  )

  assert.match(layerItemStyle, /grid-template-columns:\s*24px minmax\(0,\s*1fr\) 58px 24px 24px\s*;/)
  assert.match(layerItemStyle, /gap:\s*4px/)
  assert.match(layerSelectStyle, /font-size:\s*12px/)
  assert.match(layerSelectStyle, /white-space:\s*nowrap/)
  assert.match(layerSelectStyle, /overflow:\s*hidden/)
  assert.match(layerSelectStyle, /text-overflow:\s*ellipsis/)
  assert.match(layerOpacityStyle, /width:\s*58px/)
  assert.match(layerOpacityStyle, /font-size:\s*12px/)
  assert.match(layerOpacityInputStyle, /height:\s*28px/)
  assert.match(layerActionStyle, /width:\s*24px/)
  assert.match(layerActionStyle, /height:\s*24px/)
  assert.match(layerActionStyle, /padding:\s*0/)
  assert.match(layerIconStyle, /width:\s*14px/)
  assert.match(layerIconStyle, /height:\s*14px/)
  assert.match(layerTitleStyle, /font-size:\s*12px/)
  assert.match(editorSource, /class="pe-layer-select"[\s\S]*?:title="layer\.name"/)
  assert.match(editorSource, /:aria-label="layer\.name"/)
})
```

- [ ] **Step 2: Run the targeted test and verify RED**

```bash
node --test --test-name-pattern="one-line layer titles" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because the scoped compact selectors and new dimensions do not exist.

- [ ] **Step 3: Apply the minimal SCSS changes**

Update the row and controls:

```scss
.pe-layers-panel .pe-panel-title-row h2,
.pe-layers-panel .pe-panel-title-row button {
  font-size: 12px;
}

.pe-layer-item {
  grid-template-columns: 24px minmax(0, 1fr) 58px 24px 24px;
  gap: 4px;
}

.pe-app-shell .pe-layer-select {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 4px 2px;
  border: 0;
  background: transparent;
  color: inherit;
  text-overflow: ellipsis;
  text-align: left;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
}

.pe-layer-opacity {
  width: 58px;
  font-size: 12px;
}

.pe-layer-opacity input {
  height: 28px;
  padding: 2px 3px;
}

.pe-app-shell .pe-layer-visibility,
.pe-app-shell .pe-layer-action {
  width: 24px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  padding: 0;
}

.pe-layer-visibility svg,
.pe-layer-action svg {
  width: 14px;
  height: 14px;
}
```

Retain the existing border, background, colors, hover, danger, and behavior rules.

- [ ] **Step 4: Run targeted and neighboring contracts**

```bash
node --test --test-name-pattern="one-line layer titles|compact layer rows|desktop editor viewport" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: all selected tests PASS.

- [ ] **Step 5: Run static verification**

```bash
pnpm exec eslint tests/modules/pixel-editor/editor-ui-contract.test.ts
pnpm run build:qa
git diff --check
```

Expected: all commands succeed; existing Browserslist and chunk warnings are acceptable.

- [ ] **Step 6: Verify the live layer panel**

At `1440 × 700` and `1440 × 900`, verify:

- all scoped text computes to `12px`;
- normal title visible width increases materially from the old layout;
- a long title remains one line, shows an ellipsis, and retains the full DOM `title`;
- action buttons compute to `24 × 24px`, padding `0`, and SVGs to `14 × 14px`;
- opacity group computes to `58px`, input height to `28px`, and `%` remains visible;
- all layer handlers and panel/document overflow behavior remain unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "style: compact layer controls"
```

## Self-Review

- Spec coverage: 12px text, wider one-line title, smaller icons/input, ellipsis/title preservation, and unchanged behavior are covered.
- Placeholder scan: no deferred work or vague verification remains.
- Type consistency: no runtime types, functions, or component interfaces are introduced.
