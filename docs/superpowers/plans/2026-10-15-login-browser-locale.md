# Login Browser Locale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every login-page visit follow the current browser language and persist the active language only after successful authentication.

**Architecture:** Keep locale mapping and mutation in the existing i18n module. Add an opt-out flag for persistence so the login page can apply browser language without changing storage, while all authenticated language switches retain the existing persistent behavior.

**Tech Stack:** Vue 3, TypeScript, Vue I18n, Vite

**Spec:** `docs/plans/2026-10-15-login-browser-locale-design.md`

## Global Constraints

- Browser locale comes from `navigator.language`.
- Supported locales remain exactly `zh-CN` and `en-US`.
- Login-page locale changes must not write storage before authentication succeeds.
- Existing authenticated locale changes must continue writing `localStorage.locale`.

---

### Task 1: Add non-persistent locale application

**Files:**
- Modify: `src/locales/index.ts:22-67`

**Interfaces:**
- Produces: `getBrowserLocale(): SupportLocale`
- Produces: `setLocale(locale: SupportLocale, persist?: boolean): void`

- [ ] **Step 1: Export browser-locale mapping**

Make `getBrowserLocale` public and retain exact supported-locale matching. Map `zh-*` to `zh-CN`, `en-*` to `en-US`, and other languages to `en-US`.

- [ ] **Step 2: Add optional persistence**

Change `setLocale` to accept `persist = true`. Always update Vue I18n and `document.documentElement.lang`; write `localStorage.locale` only when `persist` is true.

- [ ] **Step 3: Run the type checker**

Run: `npx vue-tsc --noEmit`

Expected: no new errors caused by the locale API changes.

### Task 2: Apply browser language at the authentication boundary

**Files:**
- Modify: `src/pages/auth/login.ts:8-82,129-170`

**Interfaces:**
- Consumes: `getBrowserLocale(): SupportLocale`
- Consumes: `setLocale(locale: SupportLocale, persist?: boolean): void`

- [ ] **Step 1: Initialize login-page language**

At setup time, call `getBrowserLocale()`, apply it with `setLocale(locale, false)`, and initialize the language selector from that value.

- [ ] **Step 2: Avoid persistence before login**

Update the login-page language-change handler to call `setLocale(locale, false)`.

- [ ] **Step 3: Persist after successful login**

After authentication data is accepted and before navigation, call `setLocale(getLocale())` so the active locale is stored.

- [ ] **Step 4: Build the application**

Run: `npm run build:qa`

Expected: Vite produces the QA bundle successfully.

- [ ] **Step 5: Review the diff**

Run: `git diff --check && git diff -- src/locales/index.ts src/pages/auth/login.ts`

Expected: no whitespace errors and the diff only changes the described locale lifecycle.
