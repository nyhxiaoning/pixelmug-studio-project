# Pixel Editor Frame Thumbnail Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show every bottom-frame thumbnail completely at its native `2:1` ratio, let the frame strip fill `.pe-frame-content`, and keep excess frames in a local horizontal scroller.

**Architecture:** This is a presentation-only change. Keep the existing `96 × 48` canvas backing store and all Vue frame handlers, replace the unused two-column frame-content layout with one full-width track, and derive the displayed canvas height from its `2:1` aspect ratio. A source-level UI contract prevents regression without coupling to frame rendering internals.

**Tech Stack:** Vue 3 template, SCSS, Node.js `node:test`, Vite QA build

## Global Constraints

- Do not change frame selection, dragging, ordering, numbering, or thumbnail rendering logic.
- Do not add dependencies.
- Keep `.pe-frames-list` as the only horizontal overflow owner.
- Preserve the intrinsic canvas attributes `width="96"` and `height="48"`.
- The complete thumbnail must remain visible without crop or geometric distortion.

---

### Task 1: Lock and implement complete frame-thumbnail presentation

**Files:**
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/styles/index.scss`
- Verify: `src/modules/pixel-editor/components/editor/PixelEditor.vue`

**Interfaces:**
- Consumes: Existing `.pe-frame-content`, `.pe-frames-list`, `.pe-frame-item`, and `.pe-frame-item canvas` selectors; existing `setFrameThumbRef(frame.id, el)` binding.
- Produces: A one-column full-width frame content area, stable `186px` frame cards, and an uncropped `2:1` displayed canvas.

- [ ] **Step 1: Write the failing contract test**

Add a test that extracts the four frame CSS blocks and the frame thumbnail template, then asserts:

```ts
test('shows complete frame thumbnails in a full-width horizontal strip', () => {
  const frameContentStyle = extractCssBlock(editorStyles, '.pe-frame-content')
  const framesListStyle = extractCssBlock(editorStyles, '.pe-frames-list')
  const frameItemStyle = extractCssBlock(editorStyles, '.pe-frame-item')
  const frameCanvasStyle = extractCssBlock(editorStyles, '.pe-frame-item canvas')
  const frameCanvasTag = editorSource.match(
    /<canvas\s+[^>]*:ref="\(el\) => setFrameThumbRef\(frame\.id, el\)"[^>]*>/
  )?.[0]

  assert.match(frameContentStyle, /grid-template-columns:\s*minmax\(0,\s*1fr\)/)
  assert.doesNotMatch(frameContentStyle, /minmax\(180px,\s*240px\)/)
  assert.match(framesListStyle, /overflow-x:\s*auto/)
  assert.match(framesListStyle, /overflow-y:\s*hidden/)
  assert.match(frameItemStyle, /flex:\s*0 0 186px/)
  assert.match(frameCanvasStyle, /width:\s*100%/)
  assert.match(frameCanvasStyle, /height:\s*auto/)
  assert.match(frameCanvasStyle, /aspect-ratio:\s*2\s*\/\s*1/)
  assert.doesNotMatch(frameCanvasStyle, /object-fit:\s*cover/)
  assert.ok(frameCanvasTag)
  assert.match(frameCanvasTag, /width="96"/)
  assert.match(frameCanvasTag, /height="48"/)
})
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```bash
node --test --test-name-pattern="complete frame thumbnails" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because `.pe-frame-content` still declares two columns and the canvas still uses `height: 74px` without `aspect-ratio`.

- [ ] **Step 3: Apply the minimal SCSS change**

Update the existing blocks to:

```scss
.pe-frame-content {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.pe-frame-item canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 2 / 1;
  image-rendering: pixelated;
  background: #000;
  border-radius: 6px;
  border: 1px solid var(--pe-panel-border);
}
```

Do not modify `.pe-frame-item { flex: 0 0 186px; }` or the overflow declarations on `.pe-frames-list`.

- [ ] **Step 4: Run targeted and neighboring contracts**

Run:

```bash
node --test --test-name-pattern="complete frame thumbnails|desktop editor viewport|compact layer rows" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: all selected tests PASS.

- [ ] **Step 5: Run static verification**

Run:

```bash
pnpm exec eslint tests/modules/pixel-editor/editor-ui-contract.test.ts
pnpm run build:qa
git diff --check
```

Expected: commands exit successfully; only existing Browserslist or chunk-size build warnings are acceptable.

- [ ] **Step 6: Verify the live layout**

At a representative desktop viewport, confirm:

- `.pe-frame-content` and `.pe-frames-list` have the same usable width.
- A rendered frame canvas has a computed width-to-height ratio of `2`.
- The canvas is fully visible inside its frame card.
- With enough frame items, `.pe-frames-list.scrollWidth > .pe-frames-list.clientWidth` while document-level width and height remain unchanged.

- [ ] **Step 7: Commit the implementation**

```bash
git add src/modules/pixel-editor/styles/index.scss tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "fix: preserve complete frame thumbnails"
```

## Self-Review

- Spec coverage: full-width content, complete `2:1` display, stable cards, local horizontal overflow, and unchanged frame behavior are covered.
- Placeholder scan: no deferred implementation or unspecified tests remain.
- Type consistency: no new runtime types, functions, or component interfaces are introduced.
