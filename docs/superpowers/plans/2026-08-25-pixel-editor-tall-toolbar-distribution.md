# Pixel Editor Tall Toolbar Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distribute the existing left-toolbar groups across taller screens, add comfortable heading padding in tall mode, and preserve every current control size plus the existing compact and short-height behaviors.

**Architecture:** Add one height-gated SCSS rule at `min-height: 800px`. The toolbar becomes a column flex container whose direct children are distributed with `space-between`, and its group headings receive `4px` block padding; no template, component state, or control sizing changes are required. Source contracts lock the breakpoint, allowed selectors/declarations, existing group order, and compact/short-height rules.

**Tech Stack:** Vue 3 template, SCSS media queries, Node.js `node:test`, Vite QA build

## Global Constraints

- Use `@media (min-height: 800px)` exactly.
- Do not change button, icon, input, select, textarea, font, section padding, or internal row-gap sizes.
- In tall mode only, set every group heading to `padding-block: 4px`.
- Preserve the existing `@media (max-height: 699px)` toolbar scrolling fallback.
- Preserve all six group markers and their order.
- Do not add JavaScript or runtime viewport listeners.

---

### Task 1: Distribute toolbar groups on tall screens

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/styles/index.scss`
- Verify: `src/modules/pixel-editor/components/editor/PixelEditor.vue`

**Interfaces:**
- Consumes: `.pe-tools-panel` and its six existing direct children.
- Produces: A tall-height flex-column distribution mode activated at `800px` and above.

- [ ] **Step 1: Add the failing tall-toolbar contract**

Add:

```ts
test('distributes toolbar groups only when the viewport is tall', () => {
  const toolbarStyle = extractCssBlock(editorStyles, '.pe-tools-panel')
  const tallViewportStyle = extractCssBlock(editorStyles, '@media (min-height: 800px)')
  const tallToolbarStyle = tallViewportStyle.match(/\.pe-tools-panel\s*\{([^}]*)\}/s)?.[1] ?? ''
  const tallHeadingStyle = extractCssBlock(tallViewportStyle, '.pe-tools-panel .pe-tool-section h2')
  const shortViewportStyle = extractCssBlock(editorStyles, '@media (max-height: 699px)')

  assert.doesNotMatch(toolbarStyle, /display:\s*flex|justify-content:\s*space-between/)
  assert.match(
    tallViewportStyle,
    /\.pe-tools-panel\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*justify-content:\s*space-between/s
  )
  assert.deepEqual(
    [...tallToolbarStyle.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(([, property, value]) => [property, value.trim()]),
    [['display', 'flex'], ['flex-direction', 'column'], ['justify-content', 'space-between']]
  )
  assert.match(tallHeadingStyle, /padding-block:\s*4px\s*;/)
  assert.match(shortViewportStyle, /\.pe-tools-panel\s*\{[^}]*overflow-y:\s*auto/s)
})
```

Reuse the existing compact-toolbar test for the six group markers and unchanged control dimensions.

- [ ] **Step 2: Run the targeted test and verify RED**

```bash
node --test --test-name-pattern="distributes toolbar groups" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because `@media (min-height: 800px)` does not exist.

- [ ] **Step 3: Add the minimal SCSS rule**

Add before the short-height fallback:

```scss
@media (min-height: 800px) {
  .pe-tools-panel {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .pe-tools-panel .pe-tool-section h2 {
    padding-block: 4px;
  }
}
```

Do not alter the existing compact toolbar or `max-height: 699px` blocks.

- [ ] **Step 4: Run targeted and neighboring contracts**

```bash
node --test --test-name-pattern="distributes toolbar groups|left toolbar compact|desktop editor viewport" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: all selected tests PASS.

- [ ] **Step 5: Run static verification**

```bash
pnpm exec eslint tests/modules/pixel-editor/editor-ui-contract.test.ts
pnpm run build:qa
git diff --check
```

Expected: all commands succeed; existing Browserslist and chunk-size warnings are acceptable.

- [ ] **Step 6: Verify four viewport heights in the live editor**

At widths of `1440px`, measure heights `700`, `754`, `900`, and `1080px`:

- `700` and `754`: computed `.pe-tools-panel` display remains the compact non-flex value; current control sizes remain unchanged.
- `900` and `1080`: computed display is `flex`, direction is `column`, and justification is `space-between`.
- At tall heights, first group top aligns with the toolbar content top and footer bottom aligns with toolbar bottom.
- Intermediate gaps are non-negative and substantially uniform.
- Every group heading computes to `4px` top and bottom padding at `900px` and `1080px`, and `0px` at `700px` and `754px`.
- A representative icon button remains `32px` minimum height with a `15 × 15px` SVG; representative input/select/textarea remain `28px` high.
- Document scroll behavior remains unchanged at each breakpoint.

- [ ] **Step 7: Commit**

```bash
git add src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "style: distribute tall toolbar groups"
```

## Self-Review

- Spec coverage: tall distribution, compact preservation, short-height scrolling, group order, and unchanged control sizes are covered.
- Placeholder scan: no deferred work or unspecified test behavior remains.
- Type consistency: no runtime types, functions, or template interfaces are added.
