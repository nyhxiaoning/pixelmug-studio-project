import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const editorSource = readFileSync(
  new URL('../../../src/modules/pixel-editor/components/editor/PixelEditor.vue', import.meta.url),
  'utf8'
)
const editorStyles = readFileSync(
  new URL('../../../src/modules/pixel-editor/styles/index.scss', import.meta.url),
  'utf8'
)
const localeSources = [
  '../../../src/locales/zh-CN/common.ts',
  '../../../src/locales/en-US/common.ts',
  '../../../src/locales/ja/common.ts',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))

function extractCssBlock(source: string, marker: string): string {
  const start = source.indexOf(marker)
  assert.ok(start >= 0, `Missing CSS block: ${marker}`)
  const openBrace = source.indexOf('{', start)
  assert.ok(openBrace >= 0, `Missing opening brace for: ${marker}`)

  let depth = 0
  for (let index = openBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(start, index + 1)
  }

  assert.fail(`Missing closing brace for: ${marker}`)
}

function extractStartTags(source: string, tagName: string): string[] {
  const tags: string[] = []
  const marker = `<${tagName}`
  let searchFrom = 0

  while (searchFrom < source.length) {
    const start = source.indexOf(marker, searchFrom)
    if (start < 0) break

    let quote = ''
    for (let index = start + marker.length; index < source.length; index += 1) {
      const character = source[index]
      if ((character === '"' || character === "'") && (!quote || quote === character)) {
        quote = quote ? '' : character
      } else if (character === '>' && !quote) {
        tags.push(source.slice(start, index + 1))
        searchFrom = index + 1
        break
      }
    }
  }

  return tags
}

function buttonTagsByClass(className: string): string[] {
  const tags = extractStartTags(editorSource, 'button')
    .filter((candidate) => new RegExp(`class="[^"]*\\b${className}\\b`).test(candidate))

  assert.ok(tags.length > 0, `Missing button with class ${className}`)
  return tags
}

test('defines the Creator Center reference layout tokens', () => {
  assert.match(editorStyles, /--pe-nav-height:\s*57px/)
  assert.match(editorStyles, /--pe-shell-gap:\s*14px/)
  assert.match(editorStyles, /--pe-side-panel-width:\s*260px/)
  assert.match(editorStyles, /--pe-panel-radius:\s*8px/)
  assert.match(editorStyles, /--pe-reference-border:\s*#e1e6ec/)
})

test('keeps PixelEditor as the active behavior owner', () => {
  assert.match(editorSource, /ref="editorCanvasRef"/)
  assert.match(editorSource, /@pointerdown="handlePointerDown"/)
  assert.match(editorSource, /@pointermove="handlePointerMove"/)
  assert.match(editorSource, /@pointerup="handlePointerUp"/)
})

test('renders the reference top navigation with existing behavior bindings', () => {
  assert.match(editorSource, /class="pe-editor-nav"/)
  assert.match(editorSource, /class="pe-nav-title"/)
  assert.match(editorSource, /project\.frames\.length/)
  assert.match(editorSource, /currentFrame\.layers\.length/)
  assert.match(editorSource, /@command="handleImportCommand"/)
  assert.match(editorSource, /@command="handleExportCommand"/)
  assert.match(editorSource, /@click\.stop="sendWorkToDevice"/)
  assert.match(editorSource, /@click="handleSaveToOSS"/)
  assert.match(editorSource, /@click="backHome"/)
  assert.match(editorSource, /@change="handleRenameProject"/)
  assert.match(editorSource, /:disabled="saving"/)
  assert.match(editorSource, /role="status"[\s\S]*aria-live="polite"/)
  assert.equal(editorSource.match(/ref="staticFileInputRef"/g)?.length, 1)
  assert.equal(editorSource.match(/ref="gifFileInputRef"/g)?.length, 1)
})

test('defines the navigation labels in every supported locale', () => {
  for (const localeSource of localeSources) {
    assert.match(localeSource, /pxm_editor_project_name\s*:/)
    assert.match(localeSource, /pxm_editor_theme\s*:/)
    assert.match(localeSource, /pxm_editor_canvas\s*:/)
  }
})

test('groups existing tools in the live reference order', () => {
  const toolsIndex = editorSource.indexOf('pe-tool-section--drawing')
  const shapesIndex = editorSource.indexOf('pe-tool-section--shapes')
  const selectionIndex = editorSource.indexOf('pe-tool-section--selection')
  const onionIndex = editorSource.indexOf('pe-tool-section--onion')
  const textIndex = editorSource.indexOf('pe-tool-section--text')
  const footerIndex = editorSource.indexOf('pe-tools-footer')

  assert.ok(toolsIndex >= 0)
  assert.ok(toolsIndex < shapesIndex)
  assert.ok(shapesIndex < selectionIndex)
  assert.ok(selectionIndex < onionIndex)
  assert.ok(onionIndex < textIndex)
  assert.ok(textIndex < footerIndex)
  assert.match(editorSource, /<component\s+:is="toolIcon\(tool\.id\)"/)
  assert.match(editorSource, /class="pe-tools-footer"[\s\S]*v-model\.number="exportScale"/)
  assert.match(editorSource, /class="pe-tools-footer"[\s\S]*<ThemeSwitcher/)
  assert.match(editorSource, /@click="handleCopySelection\(false\)"/)
  assert.match(editorSource, /@click="handleCopySelection\(true\)"/)
  assert.match(editorSource, /@click="handleDeleteSelection"/)
  assert.match(editorSource, /@click="handleTransformSelection\('rotate-cw'\)"/)
  assert.match(editorSource, /@click="handleTransformSelection\('rotate-ccw'\)"/)
  assert.match(editorSource, /@click="handleTransformSelection\('flip-h'\)"/)
  assert.match(editorSource, /@click="handleTransformSelection\('flip-v'\)"/)
  assert.match(editorSource, /@click="handleUndo"/)
  assert.match(editorSource, /@click="handleRedo"/)
  assert.match(editorSource, /@click="handleClearLayer"/)
  assert.match(editorSource, /@click="handleStampText\(0\)"/)
  assert.match(editorSource, /@click="handleStampText\(1\)"/)
  assert.match(editorSource, /@click="handleStampText\(2\)"/)
})

test('renders the reference workspace grid without changing Canvas behavior', () => {
  const editorCanvasTag = editorSource.match(/<canvas\s+[^>]*ref="editorCanvasRef"[^>]*>/)?.[0]

  assert.match(editorSource, /class="pe-editor-grid"/)
  assert.match(editorSource, /class="pe-panel pe-canvas-panel"/)
  assert.match(editorSource, /class="pe-canvas-viewport"/)
  assert.match(editorSource, /class="pe-panel pe-layers-panel"/)
  assert.match(editorSource, /class="pe-panel pe-frame-panel"/)
  assert.ok(editorCanvasTag)
  assert.match(editorCanvasTag, /width="960"/)
  assert.match(editorCanvasTag, /height="480"/)
  assert.match(editorCanvasTag, /@pointerdown="handlePointerDown"/)
  assert.match(editorCanvasTag, /@pointermove="handlePointerMove"/)
  assert.match(editorCanvasTag, /@pointerup="handlePointerUp"/)
  assert.match(editorCanvasTag, /@pointercancel="handlePointerUp"/)
  assert.match(editorCanvasTag, /@pointerleave="handlePointerLeave"/)
  assert.match(editorSource, /@click="handleSelectLayer\(index\)"/)
  assert.match(editorSource, /@change="handleLayerOpacityPercent\(layer, \$event\)"/)
  assert.match(editorSource, /@click\.stop="handleDeleteLayer\(index\)"/)
  assert.match(editorSource, /ref="overviewScrollRef"/)
  assert.match(editorSource, /:ref="setOverviewCanvasRef"/)
  assert.match(editorSource, /@pointerdown="handleJumpViewportFromOverview"/)
  assert.match(editorSource, /@pointermove="handleOverviewPointerMove"/)
  assert.match(editorSource, /@pointerleave="handleOverviewPointerLeave"/)
  assert.match(editorStyles, /grid-template-areas:\s*['"]tools canvas layers['"]/)
  assert.match(editorStyles, /['"]tools frames frames['"]/)
})

test('renders compact layer rows with percent opacity and safe duplication', () => {
  const opacityControl = editorSource.match(
    /<label\s+class="pe-layer-opacity"[\s\S]*?<\/label>/
  )?.[0]
  const opacityHandler = editorSource.match(
    /function handleLayerOpacityPercent\(layer: Layer, event: Event\): void \{[\s\S]*?\n\}/
  )?.[0]
  const duplicateHandler = editorSource.match(
    /function handleDuplicateLayer\(index: number\): void \{[\s\S]*?\n\}/
  )?.[0]

  assert.match(editorSource, /class="pe-layer-visibility"/)
  assert.match(editorSource, /class="pe-layer-select"/)
  assert.match(editorSource, /class="pe-layer-opacity"/)
  assert.match(editorSource, /@click\.stop="handleDuplicateLayer\(index\)"/)
  assert.match(editorSource, /@click\.stop="handleDeleteLayer\(index\)"/)
  assert.match(editorSource, /@click="handleSelectLayer\(index\)"/)
  assert.match(
    editorSource,
    /@click\.stop="layer\.visible = !layer\.visible; handleUpdateLayerSettings\(\)"/
  )
  assert.match(editorSource, /function layerOpacityPercent\(layer: Layer\): number/)
  assert.match(editorSource, /Math\.round\(layer\.opacity \* 100\)/)
  assert.ok(opacityControl)
  assert.match(opacityControl, /type="number"/)
  assert.match(opacityControl, /min="10"/)
  assert.match(opacityControl, /max="100"/)
  assert.match(opacityControl, /step="1"/)
  assert.match(opacityControl, /:aria-label="t\('common\.pxm_editor_layer_opacity'\)"/)
  assert.match(opacityControl, /@click\.stop/)
  assert.match(opacityControl, /@change="handleLayerOpacityPercent\(layer, \$event\)"/)
  assert.match(opacityControl, /<span>%<\/span>/)
  assert.ok(opacityHandler)
  assert.match(opacityHandler, /const raw = input\.value\.trim\(\)/)
  assert.match(opacityHandler, /if \(!raw \|\| !Number\.isFinite\(percent\)\)/)
  assert.match(opacityHandler, /input\.value = String\(layerOpacityPercent\(layer\)\)/)
  assert.match(opacityHandler, /const clamped = Math\.max\(10, Math\.min\(100, percent\)\)/)
  assert.match(opacityHandler, /layer\.opacity = clamped \/ 100/)
  assert.match(opacityHandler, /input\.value = String\(clamped\)/)
  assert.equal(opacityHandler.match(/handleUpdateLayerSettings\(\)/g)?.length, 1)
  assert.ok(duplicateHandler)
  assert.match(duplicateHandler, /layers\.length >= 4/)
  assert.match(duplicateHandler, /snapshot\(\)/)
  assert.match(duplicateHandler, /makeLayer\(index \+ 1\)/)
  const snapshotIndex = duplicateHandler.indexOf('snapshot()')
  const makeLayerIndex = duplicateHandler.indexOf('makeLayer(index + 1)')
  assert.ok(snapshotIndex >= 0)
  assert.ok(makeLayerIndex >= 0)
  assert.ok(snapshotIndex < makeLayerIndex)
  assert.match(duplicateHandler, /copy\.pixels = \[\.\.\.source\.pixels\]/)
  assert.match(duplicateHandler, /copy\.canvasPixels = \{ \.\.\.source\.canvasPixels \}/)
  assert.match(duplicateHandler, /layers\.splice\(index \+ 1, 0, copy\)/)
  assert.match(duplicateHandler, /activeLayer\.value = index \+ 1/)
  assert.match(duplicateHandler, /touchProject\(t\('common\.pxm_editor_layer_duplicated'\)\)/)
  assert.match(editorStyles, /grid-template-columns:\s*28px minmax\(0, 1fr\) 80px 28px 28px/)
})

test('keeps every animation-frame interaction in the reference bottom panel', () => {
  assert.match(editorSource, /class="pe-panel pe-frame-panel"/)
  assert.match(editorSource, /@click="handleTogglePreview"/)
  assert.match(editorSource, /@click="handleAddFrame"/)
  assert.match(editorSource, /@click="handleDuplicateFrame"/)
  assert.match(editorSource, /@click="handleDeleteFrame"/)
  assert.match(editorSource, /v-model="frameDelayInput"/)
  assert.match(editorSource, /@blur="handleCommitFrameDelay"/)
  assert.match(editorSource, /@change="handleCommitFrameDelay"/)
  assert.match(editorSource, /@keydown\.enter="handleCommitFrameDelay"/)
  assert.match(editorSource, /:ref="\(el\) => setFrameThumbRef\(frame\.id, el\)"/)
  assert.match(editorSource, /@click="handleSelectFrame\(index\)"/)
  assert.match(editorSource, /@dragstart="handleStartFrameDrag\(index, \$event\)"/)
  assert.match(editorSource, /@dragover\.prevent="handleDragOverFrame\(index, \$event\)"/)
  assert.match(editorSource, /@dragleave="dragOverFrameIndex = null"/)
  assert.match(editorSource, /@drop\.prevent="handleDropFrame\(index\)"/)
  assert.match(editorSource, /@dragend="handleEndFrameDrag"/)
  assert.match(editorSource, /ref="previewCanvasRef"/)
  assert.match(editorStyles, /\.pe-frame-panel\s*\{[\s\S]*grid-area:\s*frames/)
  assert.match(editorStyles, /grid-template-columns:\s*162px minmax\(0, 1fr\)/)
})

test('defines layer visibility and duplication feedback in every supported locale', () => {
  for (const localeSource of localeSources) {
    assert.match(localeSource, /pxm_editor_layer_duplicated\s*:/)
    assert.match(localeSource, /pxm_editor_hide_layer\s*:/)
    assert.match(localeSource, /pxm_editor_show_layer\s*:/)
    assert.match(localeSource, /pxm_editor_layer_opacity\s*:/)
  }
  assert.match(localeSources[2], /pxm_editor_copy_suffix\s*:/)
})

test('keeps the import dialog semantics and every crop interaction binding', () => {
  const modalStart = editorSource.indexOf('v-if="importDialog.open"')
  const modalEnd = editorSource.indexOf('</template>', modalStart)
  const modalBlock = editorSource.slice(modalStart, modalEnd)

  assert.ok(modalStart >= 0)
  assert.ok(modalEnd > modalStart)
  assert.match(modalBlock, /class="pe-modal-backdrop"/)
  assert.match(modalBlock, /@click\.self="handleCloseImportDialog"/)
  assert.match(modalBlock, /role="dialog"/)
  assert.match(modalBlock, /aria-modal="true"/)
  assert.match(modalBlock, /:aria-label="t\('common\.pxm_editor_import_image_pixelated'\)"/)
  assert.match(modalBlock, /ref="importCropCanvasRef"/)
  assert.match(modalBlock, /@pointerdown="handleImportPointerDown"/)
  assert.match(modalBlock, /@pointermove="handleImportPointerMove"/)
  assert.match(modalBlock, /@pointerup="handleImportPointerUp"/)
  assert.match(modalBlock, /@pointercancel="handleImportPointerUp"/)
  assert.match(modalBlock, /@wheel\.prevent="handleImportWheel"/)
  assert.match(modalBlock, /v-model\.number="importDialog\.zoom"/)
  assert.match(modalBlock, /v-model="importDialog\.fit"/)
  assert.match(modalBlock, /v-model="importDialog\.dither"/)
  assert.match(modalBlock, /ref="importCanvasRef"/)
  assert.match(modalBlock, /@click="handleCloseImportDialog"/)
  assert.match(modalBlock, /@click="handleApplyImportToLayer"/)
})

test('separates device preview from the on-demand local animation preview', () => {
  const navStart = editorSource.indexOf('<header class="pe-editor-nav">')
  const navEnd = editorSource.indexOf('</header>', navStart)
  const navBlock = editorSource.slice(navStart, navEnd)
  const frameStart = editorSource.indexOf('<section class="pe-panel pe-frame-panel">')
  const frameEnd = editorSource.indexOf('</main>', frameStart)
  const frameBlock = editorSource.slice(frameStart, frameEnd)
  const previewStart = editorSource.indexOf('v-if="previewPlaying"')
  const previewEnd = editorSource.indexOf('</section>', previewStart)
  const previewBlock = editorSource.slice(previewStart, previewEnd)
  const toggleHandler = editorSource.match(
    /function handleTogglePreview\(\): void \{[\s\S]*?\n\}/
  )?.[0]

  assert.ok(navStart >= 0 && navEnd > navStart)
  assert.match(navBlock, /@click\.stop="sendWorkToDevice"/)
  assert.doesNotMatch(navBlock, /handleTogglePreview/)
  assert.ok(frameStart >= 0 && frameEnd > frameStart)
  assert.match(frameBlock, /@click="handleTogglePreview"/)
  assert.doesNotMatch(frameBlock, /sendWorkToDevice/)
  assert.ok(previewStart >= 0 && previewEnd > previewStart)
  assert.match(previewBlock, /class="pe-local-preview-popover"/)
  assert.match(previewBlock, /aria-live="polite"/)
  assert.match(previewBlock, /@click="handleTogglePreview"/)
  assert.match(previewBlock, /ref="previewCanvasRef"/)
  assert.match(previewBlock, /width="480"/)
  assert.match(previewBlock, /height="240"/)
  assert.equal(editorSource.match(/ref="previewCanvasRef"/g)?.length, 1)
  assert.ok(toggleHandler)
  assert.match(toggleHandler, /previewPlaying\.value = true/)
  assert.match(toggleHandler, /nextTick\(tick\)/)
})

test('keeps the desktop editor grid at explicit responsive breakpoints', () => {
  const baseEditorScroll = extractCssBlock(editorStyles, '.pe-editor-scroll')
  const compactDesktop = extractCssBlock(editorStyles, '@media (max-width: 1279px)')
  const narrowViewport = extractCssBlock(editorStyles, '@media (max-width: 1023px)')

  assert.match(baseEditorScroll, /min-width:\s*1024px/)
  assert.doesNotMatch(baseEditorScroll, /overflow-x:/)
  assert.match(compactDesktop, /\.pe-editor-grid\s*\{[\s\S]*grid-template-columns:\s*var\(--pe-side-panel-width\) minmax\(440px, 1fr\) var\(--pe-side-panel-width\)/)
  assert.match(compactDesktop, /\.pe-editor-nav\s*\{[\s\S]*grid-template-columns:/)
  assert.doesNotMatch(compactDesktop, /\.pe-editor-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/)

  const scrollOwner = extractCssBlock(narrowViewport, '.fullscreen-layout')
  const appShellRule = extractCssBlock(narrowViewport, '.pe-app-shell')
  const editorScrollRule = extractCssBlock(narrowViewport, '.pe-editor-scroll')
  assert.match(scrollOwner, /overflow-x:\s*auto/)
  assert.match(appShellRule, /min-width:\s*1024px/)
  assert.match(editorScrollRule, /min-width:\s*1024px/)
  assert.doesNotMatch(appShellRule, /overflow-x:/)
  assert.doesNotMatch(editorScrollRule, /overflow-x:/)
  assert.doesNotMatch(narrowViewport, /\.pe-editor-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/)
  assert.doesNotMatch(editorStyles, /@media \(max-width: 1120px\)/)
  assert.doesNotMatch(editorStyles, /@media \(max-width: 780px\)/)
})

test('restores a visible keyboard focus ring after the global reset', () => {
  const focusRing = extractCssBlock(editorStyles, '.pe-app-shell button:focus-visible')

  assert.match(focusRing, /\.pe-app-shell input:focus-visible/)
  assert.match(focusRing, /\.pe-app-shell select:focus-visible/)
  assert.match(focusRing, /outline:\s*2px solid var\(--pe-primary\)/)
  assert.match(focusRing, /outline-offset:\s*2px/)
})

test('gives every icon-only editor button an accessible name', () => {
  for (const className of [
    'pe-nav-back',
    'pe-icon-tool',
    'pe-swatch',
    'pe-layer-visibility',
    'pe-layer-action',
    'pe-frame-action',
    'pe-local-preview-close',
  ]) {
    for (const tag of buttonTagsByClass(className)) {
      assert.match(tag, /(?:^|\s):?title=/, `${className} needs a localized title`)
      assert.match(tag, /(?:^|\s):?aria-label=/, `${className} needs an accessible name`)
    }
  }

  const sizedIconTags = editorSource.match(/<(?:component|[A-Z][A-Za-z0-9]*)\b[^>]*:size="[^"]+"[^>]*\/>/g) ?? []
  assert.ok(sizedIconTags.length > 0)
  for (const tag of sizedIconTags) {
    assert.match(tag, /aria-hidden="true"/, `Decorative icon must be hidden: ${tag}`)
  }
})

test('uses a real layer selection button without nesting interactive row semantics', () => {
  const layerRowStartTag = editorSource.match(
    /<div\s+v-for="\(layer, index\) in currentFrame\.layers"[\s\S]*?>/
  )?.[0]
  const layerSelectTags = buttonTagsByClass('pe-layer-select')

  assert.ok(layerRowStartTag)
  assert.match(layerRowStartTag, /role="group"/)
  assert.match(layerRowStartTag, /:aria-label="layer\.name"/)
  assert.doesNotMatch(layerRowStartTag, /tabindex=/)
  assert.doesNotMatch(layerRowStartTag, /@click=/)
  assert.doesNotMatch(layerRowStartTag, /@keydown/)
  assert.equal(layerSelectTags.length, 1)
  assert.match(layerSelectTags[0], /:title="layer\.name"/)
  assert.match(layerSelectTags[0], /:aria-label="layer\.name"/)
  assert.match(layerSelectTags[0], /:aria-pressed="activeLayer === index"/)
  assert.match(layerSelectTags[0], /@click="handleSelectLayer\(index\)"/)
})

test('styles the import modal and local preview as reference overlays', () => {
  const backdropStyle = editorStyles.match(/\.pe-modal-backdrop\s*\{[\s\S]*?\n\}/)?.[0]
  const modalStyle = editorStyles.match(/\.pe-modal\s*\{[\s\S]*?\n\}/)?.[0]
  const popoverStyle = editorStyles.match(/\.pe-local-preview-popover\s*\{[\s\S]*?\n\}/)?.[0]
  const previewCanvasStyle = editorStyles.match(
    /\.pe-local-preview-popover canvas\s*\{[\s\S]*?\n\}/
  )?.[0]

  assert.ok(backdropStyle)
  assert.match(backdropStyle, /z-index:\s*40/)
  assert.match(backdropStyle, /background:\s*var\(--pe-modal-backdrop\)/)
  assert.match(editorStyles, /--pe-modal-backdrop:\s*rgba\(/)
  assert.ok(modalStyle)
  assert.match(modalStyle, /width:\s*min\(980px, calc\(100vw - 40px\)\)/)
  assert.match(modalStyle, /background:\s*var\(--pe-panel\)/)
  assert.match(modalStyle, /border:\s*1px solid var\(--pe-line\)/)
  assert.match(modalStyle, /border-radius:\s*var\(--pe-panel-radius\)/)
  assert.match(modalStyle, /box-shadow:\s*var\(--pe-modal-shadow\)/)
  assert.ok(popoverStyle)
  assert.match(popoverStyle, /position:\s*fixed/)
  assert.match(popoverStyle, /right:\s*14px/)
  assert.match(popoverStyle, /bottom:\s*14px/)
  assert.match(popoverStyle, /z-index:\s*30/)
  assert.match(popoverStyle, /width:\s*min\(420px, calc\(100vw - 28px\)\)/)
  assert.match(popoverStyle, /background:\s*var\(--pe-panel\)/)
  assert.match(popoverStyle, /border:\s*1px solid var\(--pe-line\)/)
  assert.match(popoverStyle, /border-radius:\s*var\(--pe-panel-radius\)/)
  assert.match(popoverStyle, /box-shadow:\s*var\(--pe-modal-shadow\)/)
  assert.ok(previewCanvasStyle)
  assert.match(previewCanvasStyle, /aspect-ratio:\s*2\s*\/\s*1/)
  assert.match(previewCanvasStyle, /image-rendering:\s*pixelated/)
})
