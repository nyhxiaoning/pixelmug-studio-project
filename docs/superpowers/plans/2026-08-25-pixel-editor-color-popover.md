# Pixel Editor Color Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the visible color label and provide a complete in-page color picker with a top-right close button, outside-click close, and Escape close.

**Architecture:** Replace the native color input trigger with a real swatch button and render Element Plus `ElColorPickerPanel` inside a controlled, body-teleported dialog. Keep `currentColor` as the only color state; add only visibility, DOM refs, and fixed-position coordinates for the popover.

**Tech Stack:** Vue 3 SFC, Element Plus `ElColorPickerPanel`, SCSS, Node.js built-in test runner.

## Global Constraints

- Keep the visible localized “Color” label.
- Preserve the row order: label, hexadecimal input, current-color swatch.
- Do not add alpha or brush-opacity behavior.
- Do not change drawing handlers, tool buttons, canvas behavior, or other toolbar groups.
- Close through the top-right button, outside pointer press, or `Escape`.
- Do not depend on Element Plus private DOM structure.

---

### Task 1: Controlled Color Picker Dialog

**Files:**
- Modify: `src/modules/pixel-editor/components/editor/PixelEditor.vue`
- Modify: `src/modules/pixel-editor/styles/index.scss`
- Modify: `src/locales/zh-CN/common.ts`
- Modify: `src/locales/en-US/common.ts`
- Modify: `src/locales/ja/common.ts`
- Test: `tests/modules/pixel-editor/editor-ui-contract.test.ts`

**Interfaces:**
- Consumes: `currentColor: Ref<string>`, `normalizeHex(value: string): string`, existing lifecycle hooks, and Element Plus `ElColorPickerPanel`.
- Produces: `colorPickerOpen: Ref<boolean>`, `handleToggleColorPicker(): void`, `handleCloseColorPicker(restoreFocus?: boolean): void`, and a teleported `.pe-color-popover[role="dialog"]`.

- [ ] **Step 1: Write the failing interaction contract**

Add one contract named `keeps the color label and closes the controlled picker safely` that asserts all of the following source-level behavior:

```ts
const colorRow = editorSource.match(
  /<div[\s\S]*?class="pe-control-row pe-color-row"[\s\S]*?<\/div>\s*<Teleport/
)?.[0]

assert.ok(colorRow)
assert.ok(colorRow.indexOf('<label') < colorRow.indexOf('class="pe-hex-input"'))
assert.ok(colorRow.indexOf('class="pe-hex-input"') < colorRow.indexOf('class="pe-color-swatch"'))
assert.match(colorRow, /ref="colorSwatchButtonRef"/)
assert.match(colorRow, /aria-haspopup="dialog"/)
assert.match(colorRow, /:aria-expanded="colorPickerOpen"/)
assert.match(editorSource, /<Teleport to="body">/)
assert.match(editorSource, /<ElColorPickerPanel\s+[\s\S]*v-model="currentColor"/)
assert.match(editorSource, /color-format="hex"/)
assert.match(editorSource, /:show-alpha="false"/)
assert.match(editorSource, /class="pe-color-popover-close"[\s\S]*@click="handleCloseColorPicker\(\)"/)
assert.match(editorSource, /role="dialog"/)
assert.match(editorSource, /@click="handleToggleColorPicker"/)
assert.match(editorSource, /document\.addEventListener\('pointerdown', handleColorPickerOutsidePointer\)/)
assert.match(editorSource, /document\.removeEventListener\('pointerdown', handleColorPickerOutsidePointer\)/)
assert.match(editorSource, /key === 'escape' && colorPickerOpen\.value/)
assert.match(editorSource, /colorSwatchButtonRef\.value\?\.focus\(\)/)
```

Also assert all three locale files define `pxm_editor_close_color_picker`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test --test-name-pattern="color label and closes the controlled picker" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: FAIL because the current swatch is a native color input and no controlled dialog or close lifecycle exists.

- [ ] **Step 3: Add localized close copy**

Add these exact entries next to `pxm_editor_color`:

```ts
// zh-CN
pxm_editor_close_color_picker: '关闭颜色选择器',

// en-US
pxm_editor_close_color_picker: 'Close color picker',

// ja
pxm_editor_close_color_picker: 'カラーピッカーを閉じる',
```

- [ ] **Step 4: Import the standalone Element Plus panel and add state**

Extend the Element Plus import and add the visibility, refs, and fixed-position state:

```ts
import { ElColorPickerPanel, ElMessage, ElMessageBox } from 'element-plus'

const colorPickerOpen = ref(false)
const colorControlRef = ref<HTMLDivElement | null>(null)
const colorPopoverRef = ref<HTMLDivElement | null>(null)
const colorSwatchButtonRef = ref<HTMLButtonElement | null>(null)
const colorPopoverStyle = reactive({ top: '0px', left: '0px' })
```

- [ ] **Step 5: Add controlled open, close, positioning, and outside-click functions**

Add these functions near the other tool handlers:

```ts
function positionColorPopover(): void {
  const trigger = colorSwatchButtonRef.value
  const popover = colorPopoverRef.value
  if (!trigger || !popover) return

  const triggerRect = trigger.getBoundingClientRect()
  const popoverRect = popover.getBoundingClientRect()
  const viewportGap = 8
  const preferredLeft = triggerRect.right - popoverRect.width
  const left = Math.min(
    window.innerWidth - popoverRect.width - viewportGap,
    Math.max(viewportGap, preferredLeft)
  )
  const below = triggerRect.bottom + 6
  const top = below + popoverRect.height <= window.innerHeight - viewportGap
    ? below
    : Math.max(viewportGap, triggerRect.top - popoverRect.height - 6)

  colorPopoverStyle.left = `${left}px`
  colorPopoverStyle.top = `${top}px`
}

function handleToggleColorPicker(): void {
  colorPickerOpen.value = !colorPickerOpen.value
  if (colorPickerOpen.value) nextTick(positionColorPopover)
}

function handleCloseColorPicker(restoreFocus = true): void {
  if (!colorPickerOpen.value) return
  colorPickerOpen.value = false
  if (restoreFocus) nextTick(() => colorSwatchButtonRef.value?.focus())
}

function handleColorPickerOutsidePointer(event: PointerEvent): void {
  if (!colorPickerOpen.value || !(event.target instanceof Node)) return
  if (colorControlRef.value?.contains(event.target)) return
  if (colorPopoverRef.value?.contains(event.target)) return
  handleCloseColorPicker(false)
}
```

- [ ] **Step 6: Prioritize Escape before typing-target handling**

At the start of `handleKeydown`, preserve the editor-view guard, close the picker first, and only then apply the existing typing-target early return:

```ts
function handleKeydown(event: KeyboardEvent): void {
  if (view.value !== 'editor') return
  const key = event.key.toLowerCase()
  if (key === 'escape' && colorPickerOpen.value) {
    event.preventDefault()
    handleCloseColorPicker()
    return
  }
  if (isTypingTarget(event.target)) return
```

Keep the existing selection-cancel and command-key branches below this block unchanged.

- [ ] **Step 7: Register and clean up the outside-pointer listener**

Add the listener with the existing lifecycle registrations:

```ts
document.addEventListener('pointerdown', handleColorPickerOutsidePointer)
```

Remove it in `onBeforeUnmount`:

```ts
document.removeEventListener('pointerdown', handleColorPickerOutsidePointer)
```

- [ ] **Step 8: Replace the native swatch with the controlled row and teleported dialog**

Use this structure in the drawing section:

```vue
<div ref="colorControlRef" class="pe-control-row pe-color-row">
  <label for="pe-current-color-value">{{ t('common.pxm_editor_color') }}</label>
  <input
    id="pe-current-color-value"
    v-model="currentColor"
    class="pe-hex-input"
    maxlength="7"
  >
  <button
    ref="colorSwatchButtonRef"
    type="button"
    class="pe-color-swatch"
    :style="{ backgroundColor: normalizeHex(currentColor) }"
    aria-haspopup="dialog"
    :aria-expanded="colorPickerOpen"
    aria-controls="pe-color-popover"
    :aria-label="t('common.pxm_editor_color')"
    @click="handleToggleColorPicker"
  ></button>
</div>

<Teleport to="body">
  <div
    v-if="colorPickerOpen"
    id="pe-color-popover"
    ref="colorPopoverRef"
    class="pe-color-popover"
    role="dialog"
    :aria-label="t('common.pxm_editor_color')"
    :style="colorPopoverStyle"
  >
    <div class="pe-color-popover-header">
      <strong>{{ t('common.pxm_editor_color') }}</strong>
      <button
        type="button"
        class="pe-color-popover-close"
        :aria-label="t('common.pxm_editor_close_color_picker')"
        @click="handleCloseColorPicker()"
      >
        ×
      </button>
    </div>
    <ElColorPickerPanel
      v-model="currentColor"
      color-format="hex"
      :show-alpha="false"
      :border="false"
    />
  </div>
</Teleport>
```

- [ ] **Step 9: Add scoped row and dialog styles**

Keep the existing 24px swatch dimensions and add button reset, dialog positioning, header, and close-button rules:

```scss
.pe-color-row label {
  flex: none;
  color: var(--pe-muted);
  white-space: nowrap;
}

.pe-color-row .pe-color-swatch {
  width: 24px;
  height: 24px;
  min-width: 24px;
  flex: 0 0 24px;
  padding: 0;
  border: 1px solid var(--pe-line);
  border-radius: 4px;
}

.pe-color-popover {
  position: fixed;
  z-index: 2200;
  padding: 8px;
  border: 1px solid var(--pe-panel-border);
  border-radius: 8px;
  background: var(--pe-panel-bg);
  box-shadow: var(--pe-shadow);
}

.pe-color-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 6px;
  font-size: 12px;
}

.pe-color-popover-close {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--pe-text);
  line-height: 1;
}
```

- [ ] **Step 10: Run focused and adjacent contracts**

Run:

```bash
node --test --test-name-pattern="color label and closes the controlled picker|drawing color value and swatch|left toolbar compact|distributes toolbar groups" tests/modules/pixel-editor/editor-ui-contract.test.ts
```

Expected: all selected tests PASS. Update the previous compact-row contract so it expects the restored label and a swatch button rather than a native color input.

- [ ] **Step 11: Run static and build verification**

Run:

```bash
pnpm exec eslint tests/modules/pixel-editor/editor-ui-contract.test.ts
pnpm run build:qa
git diff --check
```

Expected: all commands exit successfully; only existing Browserslist or chunk-size warnings are acceptable.

- [ ] **Step 12: Browser-check all close paths**

At `http://127.0.0.1:3037/#/pixel-editor` with a 1440×754 viewport, verify:

- The visible row order is label, hex input, 24px swatch.
- Clicking the swatch opens one dialog with a top-right close button.
- Changing the standalone picker updates the main hex value, swatch, and drawing color.
- The close button and Escape close the dialog and return focus to the swatch.
- Clicking outside closes without changing the selected color.
- The popover stays within the viewport and the tools panel remains free of new scrolling.

- [ ] **Step 13: Commit the implementation**

```bash
git add src/modules/pixel-editor/components/editor/PixelEditor.vue src/modules/pixel-editor/styles/index.scss src/locales/zh-CN/common.ts src/locales/en-US/common.ts src/locales/ja/common.ts tests/modules/pixel-editor/editor-ui-contract.test.ts
git commit -m "feat: add closable color picker popover"
```
