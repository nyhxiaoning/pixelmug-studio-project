# Single Default Layer and 50-Frame Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make new PC editor works start with one layer and prevent every editing entry point from taking a project beyond 50 frames.

**Architecture:** Keep the layer and frame invariants in the pixel-editor core, with a pure frame-replacement count helper for GIF imports. The active Vue SFC performs pre-mutation guards and reports one localized frame-limit message; storage sanitization remains the final defensive boundary.

**Tech Stack:** Vue 3 SFC, TypeScript, Vue I18n, Node test runner, Vite

**Spec:** `docs/plans/2026-10-16-single-default-layer-frame-limit-design.md`

## Global Constraints

- A newly created project and every new blank frame contain exactly 1 layer.
- Existing valid projects keep their existing 1–4 layers.
- Every frame retains at least 1 layer after sanitization and user deletion.
- A project contains at most 50 frames.
- Adding, duplicating, or importing frames must reject the whole operation before mutation when it would exceed 50 frames.
- GIF imports are not silently truncated.
- Do not change the existing maximum of 4 layers per frame.
- Do not modify the inactive `PixelEditor.ts`; `PixelEditor.vue` is the active implementation.
- Do not modify or include unrelated working-tree changes.

---

### Task 1: Make One Layer the Frame Invariant

**Files:**
- Modify: `tests/modules/pixel-editor/project-storage.test.ts`
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/core/index.ts:73-108,447-473`
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:3190-3200`

**Interfaces:**
- Consumes: `makeFrame()`, `makeProject()`, raw projects passed to `sanitizeProject()`, and layer deletion requests.
- Produces: frames with one default layer, sanitization that fills only zero-layer frames, and `handleDeleteLayer(index)` that permits deletion down to one layer.

- [ ] **Step 1: Add failing core tests for the one-layer default and migration behavior**

Append these focused cases to `tests/modules/pixel-editor/project-storage.test.ts`:

```ts
test('new frames and projects start with one layer', () => {
  assert.equal(makeFrame().layers.length, 1)
  assert.equal(makeProject('single layer').frames[0].layers.length, 1)
})

test('sanitizeProject fills an empty layer list but preserves valid multiple layers', () => {
  const empty = makeProject('empty layers')
  empty.frames[0].layers = []
  assert.equal(sanitizeProject(empty).frames[0].layers.length, 1)

  const existing = makeProject('existing layers')
  existing.frames[0].layers = [makeLayer(0), makeLayer(1)]
  assert.equal(sanitizeProject(existing).frames[0].layers.length, 2)
})
```

Add a contract assertion to `tests/modules/pixel-editor/editor-ui-contract.test.ts` that extracts `handleDeleteLayer` and expects `layers.length <= 1`.

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
node --experimental-strip-types --test tests/modules/pixel-editor/project-storage.test.ts tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because `makeFrame()` creates two layers, sanitization fills to two, and deletion stops at two.

- [ ] **Step 3: Implement the one-layer invariant**

In `src/modules/pixel-editor/core/index.ts`, change the factory and sanitizer minimum:

```ts
layers: [makeLayer(0)],
```

```ts
while (layers.length < 1) layers.push(makeLayer(layers.length));
```

In `src/modules/pixel-editor/components/editor/PixelEditor.vue`, change the delete guard without changing its snapshot, index, or persistence behavior:

```ts
if (!currentFrame.value || currentFrame.value.layers.length <= 1) return
```

- [ ] **Step 4: Run the focused tests and verify success**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit the layer behavior**

```bash
git add src/modules/pixel-editor/core/index.ts src/modules/pixel-editor/components/editor/PixelEditor.vue tests/modules/pixel-editor/project-storage.test.ts tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "fix: start pixel works with one layer"
```

---

### Task 2: Calculate GIF Replacement Size Before Mutation

**Files:**
- Modify: `tests/modules/pixel-editor/frame-import.test.ts`
- Modify: `src/modules/pixel-editor/core/frame-import.ts`

**Interfaces:**
- Consumes: current frame count, selected frame index, and decoded GIF frame count.
- Produces: `frameCountAfterReplacement(targetLength: number, startIndex: number, replacementLength: number): number`.
- Semantics: mirror `replaceFramesFromIndex()` exactly, including clamping/truncating the start index and replacing as many existing trailing frames as the imported GIF supplies.

- [ ] **Step 1: Add failing projected-count tests**

Update the import in `tests/modules/pixel-editor/frame-import.test.ts` and append:

```ts
import {
  frameCountAfterReplacement,
  replaceFramesFromIndex,
} from '../../../src/modules/pixel-editor/core/frame-import.ts'

test('projects the frame count after replacing from the selected frame', () => {
  assert.equal(frameCountAfterReplacement(40, 10, 20), 40)
  assert.equal(frameCountAfterReplacement(40, 35, 20), 55)
  assert.equal(frameCountAfterReplacement(40, 100, 20), 60)
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --experimental-strip-types --test tests/modules/pixel-editor/frame-import.test.ts
```

Expected: FAIL because `frameCountAfterReplacement` is not exported.

- [ ] **Step 3: Implement the pure count helper and share index normalization**

In `src/modules/pixel-editor/core/frame-import.ts`, introduce a private normalizer and use it in both functions:

```ts
function normalizedFrameIndex(startIndex: number, targetLength: number): number {
  return Math.max(0, Math.min(Math.trunc(startIndex), targetLength))
}

export function frameCountAfterReplacement(
  targetLength: number,
  startIndex: number,
  replacementLength: number
): number {
  const safeTargetLength = Math.max(0, Math.trunc(targetLength))
  const safeReplacementLength = Math.max(0, Math.trunc(replacementLength))
  const insertionIndex = normalizedFrameIndex(startIndex, safeTargetLength)
  return Math.max(safeTargetLength, insertionIndex + safeReplacementLength)
}
```

Change `replaceFramesFromIndex()` to call `normalizedFrameIndex(startIndex, target.length)` and leave its splice/return contract unchanged.

- [ ] **Step 4: Run the focused test and verify success**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit the count helper**

```bash
git add src/modules/pixel-editor/core/frame-import.ts tests/modules/pixel-editor/frame-import.test.ts
git commit -m "test: calculate gif replacement frame count"
```

---

### Task 3: Enforce the 50-Frame Limit in the Active Editor

**Files:**
- Modify: `tests/modules/pixel-editor/gif-frame-limit.test.ts`
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:770-820,2519-2538,3460-3502`
- Modify: `src/locales/zh-CN/common.ts`
- Modify: `src/locales/en-US/common.ts`
- Modify: `src/locales/ja/common.ts`
- Modify: `src/locales/ko-KR/common.ts`

**Interfaces:**
- Consumes: `MAX_PROJECT_FRAMES`, `frameCountAfterReplacement()`, current project frames, decoded GIF frames, and Vue I18n `t()`.
- Produces: `showFrameLimit(): void`, pre-mutation guards in add/duplicate/GIF import, and locale key `common.pxm_editor_frame_limit` with `{n}` interpolation.

- [ ] **Step 1: Update and add failing limit tests**

In `tests/modules/pixel-editor/gif-frame-limit.test.ts`, align the existing expectation with the already agreed project limit:

```ts
test('limits GIF editing and export to 50 frames', () => {
  assert.equal(MAX_GIF_EXPORT_FRAMES, 50)
})
```

In `tests/modules/pixel-editor/editor-ui-contract.test.ts`, add a test that extracts `handleAddFrame`, `handleDuplicateFrame`, and `handleLoadGifImage` and verifies:

```ts
assert.match(editorSource, /MAX_PROJECT_FRAMES/)
assert.match(editorSource, /frameCountAfterReplacement/)
assert.match(editorSource, /pxm_editor_frame_limit/)
assert.match(addHandler, /frames\.length >= MAX_PROJECT_FRAMES/)
assert.match(duplicateHandler, /frames\.length >= MAX_PROJECT_FRAMES/)
assert.match(importHandler, /frameCountAfterReplacement\(/)
assert.match(importHandler, /> MAX_PROJECT_FRAMES/)
```

Also include the Korean locale in `localeSources` and assert every locale source contains `pxm_editor_frame_limit`.

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
node --experimental-strip-types --test tests/modules/pixel-editor/gif-frame-limit.test.ts tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because the old test expects 150 and the active editor has no pre-mutation guards or general limit copy.

- [ ] **Step 3: Add the shared localized limit status**

Import `MAX_PROJECT_FRAMES` from the core and `frameCountAfterReplacement` from `core/frame-import`. Add:

```ts
function showFrameLimit(): void {
  status.value = t('common.pxm_editor_frame_limit', { n: MAX_PROJECT_FRAMES })
}
```

Add `pxm_editor_frame_limit` to all four locale files with natural translations equivalent to “A work can contain up to {n} frames.”

- [ ] **Step 4: Guard add and duplicate before snapshots or mutation**

At the first line of both handlers, add:

```ts
if (project.value.frames.length >= MAX_PROJECT_FRAMES) {
  showFrameLimit()
  return
}
```

Keep all existing success behavior unchanged.

- [ ] **Step 5: Reject an oversized GIF replacement before snapshot and frame conversion**

Immediately after `decodeGifFrames(file)` resolves, calculate the final count:

```ts
const projectedFrameCount = frameCountAfterReplacement(
  project.value.frames.length,
  selectedFrameIndex,
  gifFrames.length
)
if (projectedFrameCount > MAX_PROJECT_FRAMES) {
  showFrameLimit()
  return
}
```

This guard must remain before `snapshot()`, `gifFrames.map(...)`, and `replaceFramesFromIndex(...)` so rejection performs no project mutation or unnecessary frame rendering.

- [ ] **Step 6: Run all pixel-editor tests and build**

Run:

```bash
node --experimental-strip-types --test tests/modules/pixel-editor/*.test.ts
npm run build:qa
```

Expected: all tests PASS and the QA production build completes successfully.

- [ ] **Step 7: Commit the editor limit enforcement**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/locales/zh-CN/common.ts src/locales/en-US/common.ts src/locales/ja/common.ts src/locales/ko-KR/common.ts tests/modules/pixel-editor/gif-frame-limit.test.ts tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "fix: enforce 50 frame editor limit"
```

---

## Final Verification

- [ ] Run `git status --short` and confirm only intentional files are present.
- [ ] Run `node --experimental-strip-types --test tests/modules/pixel-editor/*.test.ts` and confirm all tests pass.
- [ ] Run `npm run build:qa` and confirm the production build succeeds.
- [ ] Review the diff to confirm `PixelEditor.ts` and historical project layer arrays were not altered.
