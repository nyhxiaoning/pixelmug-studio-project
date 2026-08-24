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
  assert.match(editorSource, /class="pe-layer-name"/)
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
