# GIF Transparent Background Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve transparent GIF pixels during upload processing so transparent backgrounds are not converted to red or another palette color.

**Architecture:** Decode GIF frames as RGBA patches, composite them into a full logical RGBA canvas with disposal handling, then keep the existing Canvas-to-pixel and GIF upload pipeline. Expose the RGBA decode seam as a pure data API so the regression test does not require a browser DOM.

**Tech Stack:** Vue 3, TypeScript, `gifuct-js`, Node built-in test runner.

**Spec:** `docs/plans/2026-10-21-gif-transparent-background-design.md`

## Global Constraints

- Preserve the existing `decodeGifFrames(file)` Canvas-returning interface.
- Preserve frame delays, frame sampling, 32×16 output dimensions, and upload API contracts.
- Transparent pixels must remain Alpha `0`; visible pixels must retain their decoded RGBA color.
- Do not change GIF encoder behavior except where existing tests expose a regression.

### Task 1: Add a failing transparent-background regression test

**Files:**
- Modify: `tests/modules/pixel-editor/image-import.test.ts`
- Test: `tests/modules/pixel-editor/image-import.test.ts`

**Interfaces:**
- Consumes: `encodeGif`, `parseGIF`, and `decompressFrames` to build a deterministic GIF fixture.
- Produces: a failing assertion against `decodeGifRgbaFramesFromBuffer(buffer)`.

- [ ] **Step 1: Write the failing test**

Create a 2×1 GIF with pixels `[null, '#0000ff']`, patch palette entry 0 to red, and assert the decoded RGBA result is transparent then opaque blue:

```ts
test('preserves transparency when palette entry zero is a visible color', async () => {
  const source = encodeGif({
    width: 2,
    height: 1,
    frames: [{ delay: 100, pixels: [null, '#0000ff'] }],
  })
  const bytes = new Uint8Array(await source.arrayBuffer())
  bytes.set([255, 0, 0], 13)

  const [frame] = decodeGifRgbaFramesFromBuffer(bytes.buffer)

  assert.deepEqual(Array.from(frame.rgba), [0, 0, 0, 0, 0, 0, 255, 255])
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test --experimental-strip-types tests/modules/pixel-editor/image-import.test.ts`

Expected: FAIL because `decodeGifRgbaFramesFromBuffer` does not exist yet.

### Task 2: Implement RGBA compositing and preserve the existing Canvas API

**Files:**
- Modify: `src/modules/pixel-editor/core/image-import.ts`
- Test: `tests/modules/pixel-editor/image-import.test.ts`

**Interfaces:**
- Consumes: `ArrayBuffer` GIF input.
- Produces: `decodeGifRgbaFramesFromBuffer(buffer): Array<{ imageData: Uint8ClampedArray; width: number; height: number; delay: number }>` and existing Canvas frames from `decodeGifFramesFromBuffer`.

- [ ] **Step 1: Add the pure RGBA decoder seam**

Use `decompressFrames(gif, true)`. Maintain a full RGBA `Uint8ClampedArray`, copy the pre-frame canvas for disposal 3, clear the previous frame rectangle for disposal 2, draw only patch pixels whose Alpha is nonzero, and copy the composed canvas for each output frame.

- [ ] **Step 2: Make the existing decoder use the RGBA seam**

For each returned RGBA frame, create a Canvas, construct `ImageData` from the RGBA array, call `putImageData`, and preserve the existing minimum delay behavior.

- [ ] **Step 3: Run the focused test and verify it passes**

Run: `node --test --experimental-strip-types tests/modules/pixel-editor/image-import.test.ts`

Expected: PASS, with the transparent pixel retaining Alpha `0` despite its red palette entry.

### Task 3: Verify the upload path and regression suite

**Files:**
- No production changes expected.
- Test: `tests/modules/pixel-editor/gif-upload.test.ts`
- Test: `tests/pages/works-gif-sampling-contract.test.ts`

**Interfaces:**
- Consumes: the updated decoder and existing GIF upload helpers.
- Produces: passing focused and repository-level checks.

- [ ] **Step 1: Run GIF-focused tests**

Run: `node --test --experimental-strip-types tests/modules/pixel-editor/image-import.test.ts tests/modules/pixel-editor/gif-upload.test.ts tests/pages/works-gif-sampling-contract.test.ts`

- [ ] **Step 2: Run type checking**

Run: `pnpm exec vue-tsc --noEmit`

- [ ] **Step 3: Inspect the final diff and confirm no debug artifacts**

Run: `git diff --check` and `rg -n '\[DEBUG-' src tests`

- [ ] **Step 4: Commit the implementation**

```bash
git add src/modules/pixel-editor/core/image-import.ts tests/modules/pixel-editor/image-import.test.ts
git commit -m "fix: preserve transparent gif backgrounds"
```
