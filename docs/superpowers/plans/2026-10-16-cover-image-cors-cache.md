# Cover Image CORS Cache Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cached work cover images editable without asking users to clear browser data.

**Architecture:** A shared URL helper gives public cover images a stable frontend cache version. Every cover preview and editor decoder uses that URL in anonymous CORS mode, separating new requests from historical non-CORS cache entries while retaining normal caching after the first fixed request.

**Tech Stack:** Vue 3 SFC, TypeScript, Node test runner, Vite

**Spec:** `docs/plans/2026-10-16-cover-image-cors-cache-design.md`

## Global Constraints

- Frontend-only: do not change OSS, CDN, or backend configuration.
- Preserve unrelated and signed URLs unchanged.
- Use a stable cache version; do not append timestamps or random values.
- Preserve existing query parameters and hashes.
- Do not modify or include unrelated working-tree changes.

---

### Task 1: Version Public Cover Image URLs

**Files:**
- Create: `src/lib/images/corsSafeImageUrl.ts`
- Create: `tests/lib/images/cors-safe-image-url.test.ts`

**Interfaces:**
- Consumes: a source URL string.
- Produces: `toCorsSafeImageUrl(url: string): string`.

- [ ] **Step 1: Write the failing URL transformation tests**

Cover the target storage host, existing query parameters, hashes, other hosts, malformed values, and common OSS signature parameters. Assert that `pixelCorsVersion=1` is stable rather than time-dependent.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --experimental-strip-types --test tests/lib/images/cors-safe-image-url.test.ts`

Expected: FAIL because `src/lib/images/corsSafeImageUrl.ts` does not exist.

- [ ] **Step 3: Implement the minimal shared helper**

Export `toCorsSafeImageUrl(url: string): string`. Parse absolute URLs with `URL`, return non-target hosts and signed URLs unchanged, set `pixelCorsVersion=1` for `storage.qajeejio.com`, and return malformed values unchanged.

- [ ] **Step 4: Run the focused test and verify success**

Run: `node --experimental-strip-types --test tests/lib/images/cors-safe-image-url.test.ts`

Expected: PASS.

### Task 2: Use the CORS-safe URL at Every Cover Boundary

**Files:**
- Modify: `src/pages/works/index.vue`
- Modify: `src/pages/publish/index.vue`
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue`
- Create: `tests/modules/pixel-editor/cover-image-cors-contract.test.ts`

**Interfaces:**
- Consumes: `toCorsSafeImageUrl(url: string): string` from Task 1.
- Produces: anonymous-CORS cover previews and cache-safe static/GIF editor loads.

- [ ] **Step 1: Write the failing integration contract test**

Read the three Vue sources and assert that works and publish cover `<img>` bindings use `toCorsSafeImageUrl(...)` with `crossorigin="anonymous"`; assert that static image loading and GIF fallback fetching pass through the helper.

- [ ] **Step 2: Run the contract test and verify failure**

Run: `node --experimental-strip-types --test tests/modules/pixel-editor/cover-image-cors-contract.test.ts`

Expected: FAIL because the Vue files still use original cover URLs.

- [ ] **Step 3: Update all cover-loading boundaries**

Import the shared helper into the works page, publish page, and pixel editor. Bind cover preview sources through it, add anonymous CORS attributes, transform the static `Image.src`, and transform the GIF fallback URL before `fetch`.

- [ ] **Step 4: Run focused and existing tests**

Run: `node --experimental-strip-types --test tests/lib/images/cors-safe-image-url.test.ts tests/modules/pixel-editor/cover-image-cors-contract.test.ts tests/modules/pixel-editor/editor-ui-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Run type and production-build validation**

Run: `npx vue-tsc --noEmit && npm run build:qa`

Expected: both commands exit successfully.

- [ ] **Step 6: Review the final diff**

Confirm that only the helper, targeted Vue call sites, tests, and approved plan documents changed; existing user worktree changes remain untouched.
