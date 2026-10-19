# GIF Duration-Based Frame Sampling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resample GIFs to at most 50 time-weighted frames while preserving normalized total duration across upload, editing, save, export, and preview boundaries.

**Architecture:** Add one generic, dependency-free sampler in the pixel-editor core and call it explicitly after GIF decode but before pixel conversion. Reuse the same function as a defensive boundary before persistence/export, change GIF encoding to cumulative delay quantization, and block device preview when a persisted GIF cannot be proven to satisfy the 50-frame contract.

**Tech Stack:** TypeScript, Vue 3 SFC, gifuct-js, custom GIF encoder, Node test runner, Vite

**Spec:** `docs/plans/2026-10-19-gif-duration-frame-sampling-design.md`

## Global Constraints

- `MAX_PROJECT_FRAMES = 50` remains the single project and GIF output limit.
- Empty frame arrays throw instead of returning an empty result.
- A non-finite delay or delay below 20ms normalizes to 20ms; valid delays are rounded to integer milliseconds.
- Sampling uses equal integer-millisecond timeline intervals and each interval's midpoint.
- Adjacent intervals merge only when they select the same source-frame index.
- The sampled delay sum exactly equals the normalized source delay sum.
- Editor GIF import keeps frames before the selected frame and samples to `MAX_PROJECT_FRAMES - selectedFrameIndex`.
- Sampling must happen before 32×16 pixel conversion on Works upload, editor import, and remote GIF fallback.
- Save, export, and preview boundaries must not output more than 50 frames.
- Do not change the existing incoming GIF 5MB rule or any other file-size rule.
- Do not modify the inactive `src/modules/pixel-editor/components/editor/PixelEditor.ts`.
- Do not add a new runtime dependency.
- Preserve unrelated working-tree changes.

---

### Task 1: Build the Generic Timeline Sampler

**Files:**
- Create: `src/modules/pixel-editor/core/gif-frame-sampling.ts`
- Create: `tests/modules/pixel-editor/gif-frame-sampling.test.ts`

**Interfaces:**
- Produces: `normalizeGifFrameDelay(delay: number): number`.
- Produces: `sampleGifFramesByDuration<T extends { delay: number }>(frames: T[], maxFrames?: number): T[]`.
- Guarantees: immutable input, integer output delays of at least 20ms, output count at most `maxFrames`, and exact normalized duration preservation.

- [ ] **Step 1: Write failing validation and normalization tests**

Create `tests/modules/pixel-editor/gif-frame-sampling.test.ts` with the imports and baseline cases:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeGifFrameDelay,
  sampleGifFramesByDuration,
} from '../../../src/modules/pixel-editor/core/gif-frame-sampling.ts'

test('rejects empty input and invalid frame limits', () => {
  assert.throws(() => sampleGifFramesByDuration([]), /empty GIF frame list/)
  assert.throws(() => sampleGifFramesByDuration([{ delay: 20 }], 0), /positive integer/)
  assert.throws(() => sampleGifFramesByDuration([{ delay: 20 }], 1.5), /positive integer/)
})

test('normalizes invalid and fractional delays without mutating source frames', () => {
  assert.equal(normalizeGifFrameDelay(Number.NaN), 20)
  assert.equal(normalizeGifFrameDelay(Number.POSITIVE_INFINITY), 20)
  assert.equal(normalizeGifFrameDelay(-1), 20)
  assert.equal(normalizeGifFrameDelay(19), 20)
  assert.equal(normalizeGifFrameDelay(20.6), 21)

  const frames = [
    { id: 'a', delay: 0, payload: { value: 1 } },
    { id: 'b', delay: 40.4, payload: { value: 2 } },
  ]
  const sampled = sampleGifFramesByDuration(frames, 50)

  assert.deepEqual(sampled.map((frame) => frame.delay), [20, 40])
  assert.deepEqual(frames.map((frame) => frame.delay), [0, 40.4])
  assert.notEqual(sampled, frames)
  assert.notEqual(sampled[0], frames[0])
  assert.equal(sampled[0].payload, frames[0].payload)
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --experimental-strip-types --test tests/modules/pixel-editor/gif-frame-sampling.test.ts
```

Expected: FAIL because `gif-frame-sampling.ts` does not exist.

- [ ] **Step 3: Implement delay normalization and the no-sampling path**

Create `src/modules/pixel-editor/core/gif-frame-sampling.ts` with:

```ts
const MIN_GIF_FRAME_DELAY_MS = 20

export function normalizeGifFrameDelay(delay: number): number {
  if (!Number.isFinite(delay) || delay < MIN_GIF_FRAME_DELAY_MS) {
    return MIN_GIF_FRAME_DELAY_MS
  }
  return Math.max(MIN_GIF_FRAME_DELAY_MS, Math.round(delay))
}

function cloneFrameWithDelay<T extends { delay: number }>(frame: T, delay: number): T {
  return { ...frame, delay } as T
}

export function sampleGifFramesByDuration<T extends { delay: number }>(
  frames: T[],
  maxFrames = 50
): T[] {
  if (frames.length === 0) {
    throw new Error('Cannot sample an empty GIF frame list.')
  }
  if (!Number.isInteger(maxFrames) || maxFrames <= 0) {
    throw new Error('maxFrames must be a positive integer.')
  }

  const normalizedFrames = frames.map((frame) =>
    cloneFrameWithDelay(frame, normalizeGifFrameDelay(frame.delay))
  )
  if (normalizedFrames.length <= maxFrames) return normalizedFrames

  return normalizedFrames
}
```

- [ ] **Step 4: Run the focused test and verify the baseline passes**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Add failing uniform, weighted, merge, and rounding tests**

Append:

```ts
test('samples 100 uniform frames into 50 midpoint frames and preserves 4000ms', () => {
  const frames = Array.from({ length: 100 }, (_, index) => ({ index, delay: 40 }))
  const sampled = sampleGifFramesByDuration(frames, 50)

  assert.equal(sampled.length, 50)
  assert.deepEqual(sampled.map((frame) => frame.index), Array.from({ length: 50 }, (_, i) => i * 2 + 1))
  assert.ok(sampled.every((frame) => frame.delay === 80))
  assert.equal(sampled.reduce((sum, frame) => sum + frame.delay, 0), 4000)
})

test('weights long source frames by time and merges adjacent hits', () => {
  const frames = [
    { id: 'short-start', delay: 20 },
    { id: 'long', delay: 1000 },
    ...Array.from({ length: 50 }, (_, index) => ({ id: `tail-${index}`, delay: 20 })),
  ]
  const sampled = sampleGifFramesByDuration(frames, 50)

  assert.ok(sampled.length < 50)
  assert.equal(sampled.filter((frame) => frame.id === 'long').length, 1)
  assert.equal(sampled.reduce((sum, frame) => sum + frame.delay, 0), 2020)
})

test('uses integer boundaries and lets the last output absorb rounding drift', () => {
  const frames = Array.from({ length: 51 }, (_, index) => ({ index, delay: index === 50 ? 21 : 20 }))
  const sampled = sampleGifFramesByDuration(frames, 50)

  assert.ok(sampled.length <= 50)
  assert.ok(sampled.every((frame) => Number.isInteger(frame.delay) && frame.delay >= 20))
  assert.equal(sampled.reduce((sum, frame) => sum + frame.delay, 0), 1021)
})

test('supports an editor-specific remaining capacity', () => {
  const frames = Array.from({ length: 100 }, (_, index) => ({ index, delay: 40 }))
  const sampled = sampleGifFramesByDuration(frames, 40)

  assert.ok(sampled.length <= 40)
  assert.equal(sampled.reduce((sum, frame) => sum + frame.delay, 0), 4000)
})
```

- [ ] **Step 6: Run the test and verify sampling cases fail**

Run the command from Step 2.

Expected: FAIL because the implementation still returns all normalized frames.

- [ ] **Step 7: Implement the linear midpoint sampler**

Replace the final `return normalizedFrames` with this algorithm:

```ts
  const totalDuration = normalizedFrames.reduce((sum, frame) => sum + frame.delay, 0)
  if (!Number.isSafeInteger(totalDuration)) {
    throw new Error('Normalized GIF duration exceeds the safe integer range.')
  }

  const output: T[] = []
  let sourceIndex = 0
  let sourceEnd = normalizedFrames[0].delay
  let previousSourceIndex = -1

  for (let intervalIndex = 0; intervalIndex < maxFrames; intervalIndex += 1) {
    const intervalStart = Math.round((intervalIndex * totalDuration) / maxFrames)
    const intervalEnd =
      intervalIndex === maxFrames - 1
        ? totalDuration
        : Math.round(((intervalIndex + 1) * totalDuration) / maxFrames)
    const midpointTimesTwo = intervalStart + intervalEnd

    while (
      sourceIndex < normalizedFrames.length - 1 &&
      sourceEnd * 2 <= midpointTimesTwo
    ) {
      sourceIndex += 1
      sourceEnd += normalizedFrames[sourceIndex].delay
    }

    const intervalDelay = intervalEnd - intervalStart
    if (sourceIndex === previousSourceIndex) {
      const previous = output[output.length - 1]
      output[output.length - 1] = cloneFrameWithDelay(previous, previous.delay + intervalDelay)
    } else {
      output.push(cloneFrameWithDelay(normalizedFrames[sourceIndex], intervalDelay))
      previousSourceIndex = sourceIndex
    }
  }

  const sampledDuration = output.reduce((sum, frame) => sum + frame.delay, 0)
  const durationDrift = totalDuration - sampledDuration
  if (durationDrift !== 0) {
    const last = output[output.length - 1]
    output[output.length - 1] = cloneFrameWithDelay(last, last.delay + durationDrift)
  }

  return output
```

- [ ] **Step 8: Run the sampler tests and verify success**

Run the command from Step 2.

Expected: all sampler tests PASS.

- [ ] **Step 9: Commit the sampler**

```bash
git add src/modules/pixel-editor/core/gif-frame-sampling.ts tests/modules/pixel-editor/gif-frame-sampling.test.ts
git commit -m "feat: sample gif frames by duration"
```

---

### Task 2: Preserve Duration During GIF Delay Quantization

**Files:**
- Modify: `src/modules/pixel-editor/core/gif-encoder.ts:182-230`
- Modify: `tests/modules/pixel-editor/gif-upload.test.ts`

**Interfaces:**
- Consumes: `normalizeGifFrameDelay(delay)` from Task 1.
- Produces: GIF frame delays quantized from cumulative elapsed milliseconds rather than independently rounded frame delays.
- Guarantees: when total input duration is a multiple of 10ms, parsing the encoded GIF yields the exact same total duration.

- [ ] **Step 1: Add a failing cumulative-rounding regression test**

Append to `tests/modules/pixel-editor/gif-upload.test.ts`:

```ts
test('preserves total duration when per-frame delays require GIF tick rounding', async () => {
  const source = new File([new Uint8Array([1])], 'duration.gif', { type: 'image/gif' })
  const pixels = Array<string | null>(32 * 16).fill('#00ff00')
  const result = encodePixelatedGifFile(
    source,
    [
      { delay: 25, pixels },
      { delay: 25, pixels },
      { delay: 25, pixels },
      { delay: 25, pixels },
    ],
    32,
    16
  )

  const parsed = parseGIF(await result.arrayBuffer())
  const frames = decompressFrames(parsed, false)
  assert.equal(frames.reduce((sum, frame) => sum + frame.delay, 0), 100)
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --experimental-strip-types --test tests/modules/pixel-editor/gif-upload.test.ts
```

Expected: FAIL because four independently rounded 25ms delays encode as 120ms total.

- [ ] **Step 3: Implement cumulative delay quantization**

Import the Task 1 helper into `gif-encoder.ts`:

```ts
import { normalizeGifFrameDelay } from './gif-frame-sampling'
```

Before `frames.forEach`, initialize:

```ts
let elapsedMs = 0
let writtenCentiseconds = 0
```

Replace the independent delay calculation inside the loop with:

```ts
elapsedMs += normalizeGifFrameDelay(frame.delay)
const targetElapsedCentiseconds = Math.round(elapsedMs / 10)
const delayCs = targetElapsedCentiseconds - writtenCentiseconds
writtenCentiseconds = targetElapsedCentiseconds
```

Keep the existing GIF block writing, palette, disposal, and pixel encoding unchanged.

- [ ] **Step 4: Run GIF upload and sampler tests**

Run:

```bash
node --experimental-strip-types --test tests/modules/pixel-editor/gif-frame-sampling.test.ts tests/modules/pixel-editor/gif-upload.test.ts
```

Expected: PASS, including the existing `[80, 160]` frame-delay assertion.

- [ ] **Step 5: Commit cumulative timing**

```bash
git add src/modules/pixel-editor/core/gif-encoder.ts tests/modules/pixel-editor/gif-upload.test.ts
git commit -m "fix: preserve encoded gif duration"
```

---

### Task 3: Sample Works Uploads Before Pixel Conversion

**Files:**
- Create: `tests/pages/works-gif-sampling-contract.test.ts`
- Modify: `src/pages/works/index.vue:440-460,488-526,749-829,969-1002`

**Interfaces:**
- Consumes: `sampleGifFramesByDuration()` and `MAX_PROJECT_FRAMES`.
- Produces: Works GIF uploads whose encoded GIF, editable JSON, and `frameCount` share one sampled frame list.
- Produces: `WorkItem.frameCount: number | undefined` and a preview guard that never sends a known or unverifiable legacy GIF.

- [ ] **Step 1: Write failing Works source-contract tests**

Create `tests/pages/works-gif-sampling-contract.test.ts`:

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../src/pages/works/index.vue', import.meta.url), 'utf8')

function block(marker: string, nextMarker: string): string {
  const start = source.indexOf(marker)
  const end = source.indexOf(nextMarker, start)
  assert.ok(start >= 0 && end > start)
  return source.slice(start, end)
}

test('samples decoded Works GIF frames before rendering pixels', () => {
  const handler = block('const handleFileUpload = async', 'const handleStaticImageUpload')
  const decode = handler.indexOf('await decodeGifFrames(file)')
  const sample = handler.indexOf('sampleGifFramesByDuration(')
  const render = handler.indexOf('renderImageToPixels(')

  assert.match(source, /MAX_PROJECT_FRAMES/)
  assert.ok(decode >= 0 && decode < sample && sample < render)
  assert.match(handler, /frameCount:\s*sampledGifFrames\.length/)
})

test('keeps incoming GIF file-size validation unchanged', () => {
  const uploadFileSource = readFileSync(
    new URL('../../src/lib/images/uploadFile.ts', import.meta.url),
    'utf8'
  )
  assert.match(uploadFileSource, /case AllowedArtifactTypes\.GIF:\s*return file\.size > 5 \* 1024 \* 1024/)
})

test('blocks Works device preview for GIFs without a reliable compliant frame count', () => {
  const preview = block('const sendWorkToDevice = async', '</script>')
  assert.match(source, /frameCount:\s*api\.frameCount/)
  assert.match(
    preview,
    /work\.type === 'GIF'[\s\S]*!Number\.isInteger\(work\.frameCount\)[\s\S]*work\.frameCount > MAX_PROJECT_FRAMES[\s\S]*return/
  )
})
```

- [ ] **Step 2: Run the new test and verify failure**

Run:

```bash
node --experimental-strip-types --test tests/pages/works-gif-sampling-contract.test.ts
```

Expected: FAIL because Works neither imports nor calls the sampler and omits `frameCount` from `WorkItem`.

- [ ] **Step 3: Wire the sampler into Works upload**

Add imports:

```ts
import { sampleGifFramesByDuration } from '@/modules/pixel-editor/core/gif-frame-sampling'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  WIDTH,
  HEIGHT,
  MAX_PROJECT_FRAMES,
} from '@/modules/pixel-editor/core/index'
```

Immediately after decode:

```ts
const decodedGifFrames = await decodeGifFrames(file)
const sampledGifFrames = sampleGifFramesByDuration(decodedGifFrames, MAX_PROJECT_FRAMES)
```

Use `sampledGifFrames` for `framesData.map(...)`, GIF re-encoding, JSON upload, logging, and:

```ts
frameCount: sampledGifFrames.length,
```

Do not move or modify `await checkFile(file, t)`.

- [ ] **Step 4: Preserve frame-count metadata and guard Works preview**

Add to `WorkItem`:

```ts
frameCount: number | undefined
```

Add to `toWorkItem()`:

```ts
frameCount: api.frameCount,
```

Before `previewToDeviceApi()` for a GIF, add:

```ts
if (
  work.type === 'GIF' &&
  (!Number.isInteger(work.frameCount) ||
    (work.frameCount as number) > MAX_PROJECT_FRAMES)
) {
  ElMessage.warning(t('common.pxm_editor_frame_limit', { n: MAX_PROJECT_FRAMES }))
  return
}
```

This deliberately blocks legacy GIFs with missing metadata instead of silently sending an unverifiable artifact or mutating the work during preview.

- [ ] **Step 5: Run the Works contract and GIF tests**

Run:

```bash
node --experimental-strip-types --test tests/pages/works-gif-sampling-contract.test.ts tests/modules/pixel-editor/gif-frame-sampling.test.ts tests/modules/pixel-editor/gif-upload.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Works integration**

```bash
git add src/pages/works/index.vue tests/pages/works-gif-sampling-contract.test.ts
git commit -m "feat: resample gif uploads on works page"
```

---

### Task 4: Resample Editor Imports and Remote Work Loads

**Files:**
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:770-825,1859-2170,3478-3532`
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `tests/modules/pixel-editor/editor-behavior.test.ts`

**Interfaces:**
- Consumes: `sampleGifFramesByDuration()` and `MAX_PROJECT_FRAMES`.
- Produces: `requiresGifResave: Ref<boolean>` for a loaded historical work that was sampled.
- Produces: editor import capacity `MAX_PROJECT_FRAMES - selectedFrameIndex`.
- Guarantees: decode → sample → pixel conversion ordering in local import and remote GIF fallback.

- [ ] **Step 1: Replace rejection-oriented contract expectations with sampling expectations**

In `editor-ui-contract.test.ts`, change the import contract to require:

```ts
assert.match(importHandler, /const availableFrames = MAX_PROJECT_FRAMES - selectedFrameIndex/)
assert.match(
  importHandler,
  /const sampledGifFrames = sampleGifFramesByDuration\(decodedGifFrames, availableFrames\)/
)
assert.ok(importHandler.indexOf('sampleGifFramesByDuration(') < importHandler.indexOf('renderImageToPixels('))
assert.match(importHandler, /frameCountAfterReplacement\([\s\S]*sampledGifFrames\.length/)
```

Replace the existing remote-library rejection test with assertions that `loadWorkForEdit` calls the sampler before `gifFrames.map(...)`/`renderImageToPixels(...)` and sets `requiresGifResave.value` when the sampled count differs.

Add a contract assertion that the `editableFileUrl` branch samples `projectData.frames` before `sanitizeProject()`.

- [ ] **Step 2: Update behavior-harness dependencies and failing expectations**

In `editor-behavior.test.ts`:

- Add a `requiresGifResave: ref(false)` dependency.
- Add `sampleGifFramesByDuration` to the dependency map and use the real imported function.
- Change the 51-frame remote-GIF test from “preserves previous identity by rejecting” to expect a loaded project with at most 50 frames, the new work identity, and `requiresGifResave.value === true`.
- Add an import case with a 50-frame project, `currentFrameIndex.value = 10`, and a 100-frame decoded GIF; expect the imported replacement list to contain at most 40 frames and the final project to remain at most 50.
- Keep the existing active-layer selection assertion.

- [ ] **Step 3: Run focused editor tests and verify failure**

Run:

```bash
node --experimental-strip-types --test tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/editor-behavior.test.ts
```

Expected: FAIL because the editor still rejects oversized decoded GIFs and does not define the sampler/resave state.

- [ ] **Step 4: Implement dynamic-capacity editor import**

Import:

```ts
import { sampleGifFramesByDuration } from '@/modules/pixel-editor/core/gif-frame-sampling'
```

Change `handleLoadGifImage()` to:

```ts
const selectedFrameIndex = currentFrameIndex.value
const decodedGifFrames = await decodeGifFrames(file)
const availableFrames = MAX_PROJECT_FRAMES - selectedFrameIndex
const sampledGifFrames = sampleGifFramesByDuration(decodedGifFrames, availableFrames)
const projectedFrameCount = frameCountAfterReplacement(
  project.value.frames.length,
  selectedFrameIndex,
  sampledGifFrames.length
)
if (projectedFrameCount > MAX_PROJECT_FRAMES) {
  showFrameLimit()
  return
}
```

Map `sampledGifFrames`, not the decoded list. Leave snapshotting after sampling/validation and before project mutation.

- [ ] **Step 5: Sample editable JSON and remote GIF fallbacks**

Define near the existing work-loading state:

```ts
const requiresGifResave = ref(false)
```

At the start of `loadWorkForEdit`, keep a local flag so a failed load cannot alter the normalization state of the work that is still open:

```ts
let loadedWorkRequiresGifResave = false
```

For the editable JSON branch:

```ts
const sourceFrames = projectData.frames || []
const sampleableProjectFrames = sourceFrames.map((frame) => ({
  ...frame,
  delay: Number(frame.delay),
}))
const sampledProjectFrames = sampleableProjectFrames.length
  ? sampleGifFramesByDuration(sampleableProjectFrames, MAX_PROJECT_FRAMES)
  : sourceFrames
loadedWorkRequiresGifResave = sampledProjectFrames.length !== sourceFrames.length
```

Map `sampledProjectFrames` into editor frames. Empty JSON frame arrays must continue through the existing sanitizer fallback rather than calling the sampler with an empty array.

For the remote GIF branch:

```ts
const decodedGifFrames = await decodeGifFrames(gifFile)
const sampledGifFrames = sampleGifFramesByDuration(decodedGifFrames, MAX_PROJECT_FRAMES)
loadedWorkRequiresGifResave = sampledGifFrames.length !== decodedGifFrames.length
```

Delete the old `gifFrames.length > MAX_PROJECT_FRAMES` rejection and map the sampled list before pixel conversion. In each successful branch, assign `requiresGifResave.value = loadedWorkRequiresGifResave` only when assigning the new `project`, `editingWorkId`, and `editingWork`. Reset the ref to `false` when creating or opening an unrelated local project.

- [ ] **Step 6: Run focused editor tests and verify success**

Run the command from Step 3.

Expected: PASS.

- [ ] **Step 7: Commit editor input sampling**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/editor-behavior.test.ts
git commit -m "feat: resample gif frames on editor import"
```

---

### Task 5: Add Save, Export, and Editor Preview Safeguards

**Files:**
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:1625-1760,1793-1858,2268-2302`
- Modify: `tests/modules/pixel-editor/editor-ui-contract.test.ts`
- Modify: `tests/modules/pixel-editor/editor-behavior.test.ts`
- Modify: `tests/modules/pixel-editor/device-preview.test.ts`

**Interfaces:**
- Consumes: `sampleGifFramesByDuration()`, `requiresGifResave`, `MAX_PROJECT_FRAMES`, and existing `runDevicePreview()`.
- Produces: one sampled `outputFrames` list shared by JSON serialization, cover/static handling, GIF encoding, and `frameCount` during save.
- Guarantees: historical normalization forces a save before editor preview and clears only after successful persistence.

- [ ] **Step 1: Add failing save/export contract assertions**

In `editor-ui-contract.test.ts`, extract `saveOSSOnly` and `handleExportProjectGif` and assert:

```ts
assert.match(
  saveHandler,
  /const outputFrames = sampleGifFramesByDuration\(project\.value\.frames, MAX_PROJECT_FRAMES\)/
)
assert.match(saveHandler, /frames: outputFrames\.map/)
assert.match(saveHandler, /frameCount: outputFrames\.length/)
assert.match(exportHandler, /sampleGifFramesByDuration\(exportProject\.frames, MAX_GIF_EXPORT_FRAMES\)/)
assert.doesNotMatch(exportHandler, /frames\.length > MAX_GIF_EXPORT_FRAMES[\s\S]*return/)
```

Add an assertion that `sendWorkToDevice` passes `requiresGifResave.value` into the preview save decision.

- [ ] **Step 2: Add failing behavior tests for save and preview normalization**

Extend the `editor-behavior.test.ts` harness so the fake `uploadPixelJSON` captures uploaded project data and the fake `uploadGif` captures the encoded blob call. Add a project with 51 variable-delay frames by assigning it directly after harness construction, then assert after `saveOSSOnly()`:

```ts
assert.ok(uploadedProject.frames.length <= MAX_PROJECT_FRAMES)
assert.equal(
  uploadedProject.frames.reduce((sum, frame) => sum + frame.delay, 0),
  sourceFrames.reduce((sum, frame) => sum + Math.max(20, Math.round(frame.delay)), 0)
)
```

In `device-preview.test.ts`, add a flow where `hasChanges()` is false but the editor-level wrapper reports normalization required; expect `save()` before `preview()`.

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
node --experimental-strip-types --test tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/editor-behavior.test.ts tests/modules/pixel-editor/device-preview.test.ts
```

Expected: FAIL because save/export still use raw project frames and preview ignores historical normalization.

- [ ] **Step 4: Use one sampled frame list throughout save**

At the start of `saveOSSOnly()` after project validity is established, add:

```ts
const outputFrames = sampleGifFramesByDuration(
  project.value.frames,
  MAX_PROJECT_FRAMES
)
```

Use `outputFrames` instead of `project.value.frames` for:

- `projectData.frames` serialization;
- first-frame cover generation;
- static-vs-GIF classification;
- `gifSourceFrames` composition;
- `frameCount` and `frameDelay`.

Because frames retain their full layer data and only the shallow frame object/delay changes, `compositeFrame(frame)` remains valid.

After a successful create or update, set:

```ts
requiresGifResave.value = false
```

Do not clear the flag on upload/API failure.

- [ ] **Step 5: Sample before GIF export instead of rejecting**

Remove the early `frames.length > MAX_GIF_EXPORT_FRAMES` return. Build export source frames from:

```ts
const sampledExportFrames = sampleGifFramesByDuration(
  exportProject.frames,
  MAX_GIF_EXPORT_FRAMES
)
const sourceFrames = sampledExportFrames.map((frame) => ({
  delay: frame.delay,
  pixels: compositeFrame(frame),
}))
```

Keep resize, encoding, download naming, and success status behavior unchanged; report `resized.frames.length` as today.

- [ ] **Step 6: Force save before editor preview when normalization is pending**

Change the `runDevicePreview` call to:

```ts
await runDevicePreview({
  hasChanges: () => hasChangesSinceLastSave() || requiresGifResave.value,
  save: handleSaveToOSS,
  preview: () => pushCurrentWorkToDevice(selectedDevices),
})
```

Before sending the preview request, retain a defensive metadata guard:

```ts
if (
  work.type === 'GIF' &&
  (!Number.isInteger(work.frameCount) || work.frameCount > MAX_PROJECT_FRAMES)
) {
  ElMessage.warning(t('common.pxm_editor_frame_limit', { n: MAX_PROJECT_FRAMES }))
  return
}
```

Successful `saveOSSOnly()` already updates `editingWork.value.result` with the compliant `frameCount`, so newly normalized artifacts pass this guard.

- [ ] **Step 7: Run focused tests and verify success**

Run the command from Step 3.

Expected: PASS.

- [ ] **Step 8: Commit output safeguards**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue tests/modules/pixel-editor/editor-ui-contract.test.ts tests/modules/pixel-editor/editor-behavior.test.ts tests/modules/pixel-editor/device-preview.test.ts
git commit -m "fix: enforce gif frame limit at output boundaries"
```

---

### Task 6: Full Regression Verification

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: all artifacts from Tasks 1–5.
- Produces: test/build evidence that the integrated GIF pipeline is valid.

- [ ] **Step 1: Run all pixel-editor and Works sampling tests**

```bash
node --experimental-strip-types --test tests/modules/pixel-editor/*.test.ts tests/pages/works-gif-sampling-contract.test.ts
```

Expected: all tests PASS.

- [ ] **Step 2: Run the QA production build**

```bash
npm run build:qa
```

Expected: Vite build completes successfully with no TypeScript/Vue compilation error.

- [ ] **Step 3: Check formatting and accidental changes**

```bash
git diff --check
git status --short
git diff --stat HEAD~5..HEAD
```

Expected: no whitespace errors; only the sampler, encoder, active Vue implementation, focused tests, and approved docs are changed. `PixelEditor.ts` and `src/lib/images/uploadFile.ts` remain untouched.

- [ ] **Step 4: Review requirement evidence**

Confirm from test output and diff:

- 100 × 40ms frames become at most 50 frames totaling 4000ms.
- Variable delays influence frame selection by displayed time.
- Adjacent hits merge and retain accumulated delay.
- Editor frame 11 imports at most 40 GIF frames.
- Works conversion happens after sampling.
- Remote GIF and editable JSON fallbacks preserve duration instead of slicing/rejecting.
- Saved JSON, uploaded GIF metadata, and exported GIF are at most 50 frames.
- Device preview cannot send a known or unverifiable legacy over-limit GIF.
- Incoming GIF validation still uses the existing 5MB rule.

No extra commit is needed unless verification reveals a defect; fix any defect with its own focused failing test and commit.
