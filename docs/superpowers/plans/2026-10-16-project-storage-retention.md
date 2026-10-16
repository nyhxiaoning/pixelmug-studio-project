# Local Project Storage Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep at most the two most recently edited pixel projects in `localStorage`, remove duplicate project IDs, and enforce the agreed 50-frame/4-layer project bounds at storage boundaries.

**Architecture:** Put project bounds and retention rules in the pixel-editor core so every load and save follows one deterministic policy. `saveProjects()` returns the exact retained array so the active Vue editor can synchronize its in-memory library with persisted state; the existing centralized logout cleanup remains unchanged and is regression-tested.

**Tech Stack:** Vue 3 SFC, TypeScript, browser Storage API, Node test runner, Vite

**Spec:** `docs/plans/2026-10-16-project-storage-retention-design.md`

## Global Constraints

- Persist at most 2 projects in `pixelart_web_editor_projects`.
- Deduplicate by project ID before applying the count limit.
- For duplicate IDs, retain the greater `updatedAt`, falling back to `createdAt`; on a complete tie retain the last input occurrence.
- Retain at most 50 frames per project and 4 layers per frame at both read and write boundaries.
- Do not add a 2 MB byte quota.
- Continue omitting `canvasPixels` from serialized local storage.
- Keep logout cleanup targeted; do not clear locale, theme, or unrelated application storage.
- Do not modify the inactive `PixelEditor.ts` implementation unless it is reactivated during implementation.
- Do not modify or include unrelated working-tree changes.

---

### Task 1: Enforce Project Frame and Layer Bounds

**Files:**
- Modify: `src/modules/pixel-editor/core/index.ts:15-19,425-468`
- Create: `tests/modules/pixel-editor/project-storage.test.ts`

**Interfaces:**
- Consumes: raw project-shaped values passed to `sanitizeProject(raw)`.
- Produces: `MAX_PROJECT_FRAMES = 50`, `MAX_PROJECT_LAYERS = 4`, and a sanitized `Project` containing no more than those limits.

- [ ] **Step 1: Write the failing project-bound test**

Create `tests/modules/pixel-editor/project-storage.test.ts` with a project containing 51 frames and 5 layers per frame. Reuse real core factories so the test exercises the production structure.

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_PROJECT_FRAMES,
  MAX_PROJECT_LAYERS,
  makeFrame,
  makeLayer,
  makeProject,
  sanitizeProject,
} from '../../../src/modules/pixel-editor/core/index.ts'

test('sanitizeProject limits stored project structure', () => {
  const raw = makeProject('oversized')
  raw.currentFrameIndex = 50
  raw.frames = Array.from({ length: 51 }, () => {
    const frame = makeFrame()
    frame.layers = Array.from({ length: 5 }, (_, index) => makeLayer(index))
    return frame
  })

  const result = sanitizeProject(raw)

  assert.equal(result.frames.length, MAX_PROJECT_FRAMES)
  assert.equal(result.currentFrameIndex, MAX_PROJECT_FRAMES - 1)
  assert.ok(result.frames.every((frame) => frame.layers.length === MAX_PROJECT_LAYERS))
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --experimental-strip-types --test tests/modules/pixel-editor/project-storage.test.ts`

Expected: FAIL because `MAX_PROJECT_FRAMES` and `MAX_PROJECT_LAYERS` are not exported and `sanitizeProject()` does not cap frames.

- [ ] **Step 3: Add named project bounds and apply them during sanitization**

In `src/modules/pixel-editor/core/index.ts`, define the shared limits and keep GIF export aligned with the project frame limit.

```ts
export const MAX_PROJECT_FRAMES = 50;
export const MAX_PROJECT_LAYERS = 4;
export const MAX_GIF_EXPORT_FRAMES = MAX_PROJECT_FRAMES;
```

Change only the two hard-coded traversal limits to use the constants; keep the existing frame and layer normalization bodies unchanged.

```ts
- const frames = raw.frames.map((frame: any) => {
+ const frames = raw.frames.slice(0, MAX_PROJECT_FRAMES).map((frame: any) => {
```

```ts
- ? frame.layers.slice(0, 4).map((layer: any, index: number) => {
+ ? frame.layers.slice(0, MAX_PROJECT_LAYERS).map((layer: any, index: number) => {
```

- [ ] **Step 4: Run the focused test and verify success**

Run: `node --experimental-strip-types --test tests/modules/pixel-editor/project-storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the bounded project model**

```bash
git add src/modules/pixel-editor/core/index.ts tests/modules/pixel-editor/project-storage.test.ts
git commit -m "fix: enforce pixel project storage bounds"
```

---

### Task 2: Deduplicate Projects and Retain the Two Most Recent

**Files:**
- Modify: `src/modules/pixel-editor/core/index.ts:15-19,481-504`
- Modify: `tests/modules/pixel-editor/project-storage.test.ts`

**Interfaces:**
- Consumes: `Project[]` in its current input order.
- Produces: `MAX_STORED_PROJECTS = 2` and `retainRecentProjects(projects: Project[]): Project[]`.
- Ordering contract: choose winners by recency, then return the retained winners in their surviving input order so the existing library order does not unexpectedly reverse.

- [ ] **Step 1: Add failing retention tests**

Append helpers and tests covering count retention, duplicate replacement, tie-breaking, and `createdAt` fallback.

```ts
import {
  MAX_STORED_PROJECTS,
  retainRecentProjects,
} from '../../../src/modules/pixel-editor/core/index.ts'
import type { Project } from '../../../src/modules/pixel-editor/core/index.ts'

function projectAt(id: string, updatedAt: number, createdAt = updatedAt): Project {
  const project = makeProject(id)
  project.id = id
  project.name = id
  project.createdAt = createdAt
  project.updatedAt = updatedAt
  return project
}

test('retainRecentProjects keeps only the two newest projects', () => {
  const result = retainRecentProjects([
    projectAt('oldest', 100),
    projectAt('recent', 200),
    projectAt('newest', 300),
  ])

  assert.equal(result.length, MAX_STORED_PROJECTS)
  assert.deepEqual(result.map(({ id }) => id), ['recent', 'newest'])
})

test('retainRecentProjects keeps the newest duplicate and the last occurrence on ties', () => {
  const stale = projectAt('same', 100)
  const newest = projectAt('same', 300)
  const tiedLast = projectAt('same', 300)
  tiedLast.name = 'tie winner'

  const result = retainRecentProjects([stale, newest, tiedLast])

  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'tie winner')
})

test('retainRecentProjects falls back to createdAt for invalid updatedAt', () => {
  const project = projectAt('fallback', Number.NaN, 400)
  const older = projectAt('older', 300)
  const oldest = projectAt('oldest', 100)

  assert.deepEqual(
    retainRecentProjects([project, older, oldest]).map(({ id }) => id),
    ['fallback', 'older'],
  )
})
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --experimental-strip-types --test tests/modules/pixel-editor/project-storage.test.ts`

Expected: FAIL because `MAX_STORED_PROJECTS` and `retainRecentProjects()` do not exist.

- [ ] **Step 3: Implement deterministic retention in the core**

Add a timestamp helper that accepts only finite values. Walk the input once, replacing an ID winner when its timestamp is newer or equal, record the winning input index, select the two newest winners, then restore surviving input order before returning projects.

```ts
export const MAX_STORED_PROJECTS = 2;

function projectTimestamp(project: Project): number {
  const updatedAt = Number(project.updatedAt);
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = Number(project.createdAt);
  return Number.isFinite(createdAt) ? createdAt : 0;
}

export function retainRecentProjects(projects: Project[]): Project[] {
  const byId = new Map<string, { project: Project; timestamp: number; index: number }>();
  projects.forEach((project, index) => {
    const timestamp = projectTimestamp(project);
    const existing = byId.get(project.id);
    if (!existing || timestamp >= existing.timestamp) {
      byId.set(project.id, { project, timestamp, index });
    }
  });

  return [...byId.values()]
    .sort((left, right) => right.timestamp - left.timestamp || right.index - left.index)
    .slice(0, MAX_STORED_PROJECTS)
    .sort((left, right) => left.index - right.index)
    .map(({ project }) => project);
}
```

- [ ] **Step 4: Run the focused tests and verify success**

Run: `node --experimental-strip-types --test tests/modules/pixel-editor/project-storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit retention behavior**

```bash
git add src/modules/pixel-editor/core/index.ts tests/modules/pixel-editor/project-storage.test.ts
git commit -m "feat: retain two recent local pixel projects"
```

---

### Task 3: Apply Retention at Load and Save Boundaries

**Files:**
- Modify: `src/modules/pixel-editor/core/index.ts:481-504`
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue:3553-3562`
- Modify: `tests/modules/pixel-editor/project-storage.test.ts`
- Create: `tests/modules/pixel-editor/project-storage-contract.test.ts`

**Interfaces:**
- Consumes: `retainRecentProjects(projects: Project[]): Project[]` from Task 2 and `sanitizeProject(raw): Project` from Task 1.
- Changes: `saveProjects(projects: Project[]): Project[]` now returns the sanitized projects actually written to storage.
- Produces: `loadProjects(): Project[]` and active editor memory that exactly match persisted retention state.

- [ ] **Step 1: Add failing Storage integration tests**

Add an in-memory `Storage` implementation and verify both read and write boundaries. The save assertion must parse the actual stored JSON, not only inspect the return value.

```ts
class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()
  get length(): number { return this.values.size }
  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, String(value)) }
}

test('saveProjects stores and returns the same two bounded projects', () => {
  const storage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  const projects = [projectAt('old', 100), projectAt('recent', 200), projectAt('new', 300)]
  projects[2].frames = Array.from({ length: 51 }, () => {
    const frame = makeFrame()
    frame.layers = Array.from({ length: 5 }, (_, index) => makeLayer(index))
    frame.layers[0].canvasPixels = { '0,0': '#ffffff' }
    return frame
  })

  const retained = saveProjects(projects)
  const stored = JSON.parse(storage.getItem(STORAGE_KEY) || '[]')

  assert.deepEqual(stored.map(({ id }: Project) => id), retained.map(({ id }) => id))
  assert.deepEqual(retained.map(({ id }) => id), ['recent', 'new'])
  assert.equal(retained[1].frames.length, MAX_PROJECT_FRAMES)
  assert.ok(retained[1].frames.every((frame) => frame.layers.length === MAX_PROJECT_LAYERS))
  assert.ok(stored[1].frames.every((frame: Project['frames'][number]) =>
    frame.layers.every((layer) => !('canvasPixels' in layer)),
  ))
})

test('loadProjects cleans historical duplicates and excess projects', () => {
  const storage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  storage.setItem(STORAGE_KEY, JSON.stringify([
    projectAt('duplicate', 100),
    projectAt('other', 200),
    projectAt('duplicate', 300),
    projectAt('newest', 400),
  ]))

  assert.deepEqual(loadProjects().map(({ id }) => id), ['duplicate', 'newest'])
})
```

- [ ] **Step 2: Add a failing active-editor synchronization contract**

Create `tests/modules/pixel-editor/project-storage-contract.test.ts` and assert that the active SFC assigns the `saveProjects()` result back into `projects.value`.

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('active editor synchronizes its project library with retained storage', () => {
  const source = readFileSync(
    new URL('../../../src/modules/pixel-editor/components/editor/PixelEditor.vue', import.meta.url),
    'utf8',
  )

  assert.match(source, /projects\.value\s*=\s*saveProjects\(projects\.value\)/)
})
```

- [ ] **Step 3: Run both focused tests and verify failure**

Run:

```bash
node --experimental-strip-types --test \
  tests/modules/pixel-editor/project-storage.test.ts \
  tests/modules/pixel-editor/project-storage-contract.test.ts
```

Expected: FAIL because `saveProjects()` returns `void`, load/save do not retain two projects, and the Vue editor ignores the save result.

- [ ] **Step 4: Integrate sanitization and retention into core persistence**

Update `loadProjects()` to sanitize historical values and then retain two projects. Update `saveProjects()` to retain first, sanitize only the two winners, write their serialized form, and return the same sanitized array.

```ts
export function loadProjects(): Project[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? retainRecentProjects(parsed.map(sanitizeProject))
      : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): Project[] {
  const retained = retainRecentProjects(projects).map(sanitizeProject);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(retained.map(serializeProjectForSave)));
  return retained;
}
```

- [ ] **Step 5: Synchronize the active Vue editor after persistence**

In the active `PixelEditor.vue` `persistNow()` function, replace the ignored call with the returned retained list. Leave the commented-out `PixelEditor.ts` implementation unchanged.

```ts
projects.value = saveProjects(projects.value)
```

- [ ] **Step 6: Run both focused tests and verify success**

Run:

```bash
node --experimental-strip-types --test \
  tests/modules/pixel-editor/project-storage.test.ts \
  tests/modules/pixel-editor/project-storage-contract.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit storage-boundary integration**

```bash
git add \
  src/modules/pixel-editor/core/index.ts \
  src/modules/pixel-editor/components/editor/PixelEditor.vue \
  tests/modules/pixel-editor/project-storage.test.ts \
  tests/modules/pixel-editor/project-storage-contract.test.ts
git commit -m "fix: bound local pixel project retention"
```

---

### Task 4: Verify Logout Cleanup and Full Regression Surface

**Files:**
- Verify unchanged: `src/pinia/modules/logout-storage.ts`
- Verify unchanged: `src/pinia/modules/user.ts`
- Verify: `tests/pinia/logout-storage.test.ts`
- Verify: `tests/modules/pixel-editor/project-storage.test.ts`
- Verify: `tests/modules/pixel-editor/project-storage-contract.test.ts`

**Interfaces:**
- Consumes: the completed core persistence and active-editor synchronization behavior.
- Produces: evidence that retention, targeted logout cleanup, type checking, and the QA build all pass together.

- [ ] **Step 1: Run project-storage and logout regression tests**

Run:

```bash
node --experimental-strip-types --test \
  tests/modules/pixel-editor/project-storage.test.ts \
  tests/modules/pixel-editor/project-storage-contract.test.ts \
  tests/pinia/logout-storage.test.ts
```

Expected: all tests PASS. The logout test must continue proving that the two work keys and two session keys are removed while locale and theme remain.

- [ ] **Step 2: Run the broader pixel-editor regression suite**

Run: `node --experimental-strip-types --test tests/modules/pixel-editor/*.test.ts`

Expected: all pixel-editor tests PASS.

- [ ] **Step 3: Run type checking and the QA production build**

Run: `npx vue-tsc --noEmit && npm run build:qa`

Expected: both commands exit successfully.

- [ ] **Step 4: Inspect the final diff and whitespace**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only the approved core persistence, active Vue editor, tests, and plan documents are present. Confirm `logout-storage.ts` and `user.ts` have no new diff because their required behavior already existed.

- [ ] **Step 5: Commit any final test-only correction if needed**

Only when Step 1-4 required a test correction, commit exactly those test changes:

```bash
git add tests/modules/pixel-editor/project-storage.test.ts tests/modules/pixel-editor/project-storage-contract.test.ts
git commit -m "test: cover local project retention regressions"
```
