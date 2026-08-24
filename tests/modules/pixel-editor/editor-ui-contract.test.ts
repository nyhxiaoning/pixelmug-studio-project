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

function extractBraceBlock(source: string, marker: string): string {
  const start = source.indexOf(marker)
  assert.ok(start >= 0, `Missing code block: ${marker}`)
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

test('matches the reference navigation affordances and keeps transient feedback unobtrusive', () => {
  const importAction = editorSource.match(
    /<el-dropdown[\s\S]*?@command="handleImportCommand"[\s\S]*?<\/el-dropdown>/
  )?.[0]
  const exportAction = editorSource.match(
    /<el-dropdown[\s\S]*?@command="handleExportCommand"[\s\S]*?<\/el-dropdown>/
  )?.[0]
  const previewAction = editorSource.match(
    /<button[\s\S]*?class="pe-nav-action pe-nav-preview"[\s\S]*?@click\.stop="sendWorkToDevice"[\s\S]*?<\/button>/
  )?.[0]
  const saveAction = editorSource.match(
    /<button[\s\S]*?class="pe-nav-save"[\s\S]*?@click="handleSaveToOSS"[\s\S]*?<\/button>/
  )?.[0]
  const navBackStyle = extractCssBlock(editorStyles, '.pe-nav-back')
  const navActionStyle = extractCssBlock(editorStyles, '.pe-nav-action,')

  assert.ok(importAction)
  assert.match(importAction, /<Upload\b[\s\S]*?aria-hidden="true"/)
  assert.match(importAction, /pxm_editor_import/)
  assert.ok(exportAction)
  assert.match(exportAction, /<Download\b[\s\S]*?aria-hidden="true"/)
  assert.match(exportAction, /pxm_editor_export/)
  assert.ok(previewAction)
  assert.match(previewAction, /<MonitorUp\b[\s\S]*?aria-hidden="true"/)
  assert.match(previewAction, /pxm_action_preview/)
  assert.ok(saveAction)
  assert.match(saveAction, /<Save\b[\s\S]*?aria-hidden="true"/)
  assert.match(saveAction, /pxm_editor_save/)
  assert.match(
    editorSource,
    /v-if="status && status !== t\('common\.pxm_editor_ready'\)"[\s\S]*class="pe-nav-status"[\s\S]*role="status"[\s\S]*aria-live="polite"/
  )
  assert.match(navBackStyle, /border:\s*0\s*!important/)
  assert.match(navBackStyle, /background:\s*transparent\s*!important/)
  assert.match(navActionStyle, /display:\s*inline-flex/)
  assert.match(navActionStyle, /align-items:\s*center/)
  assert.match(navActionStyle, /gap:\s*6px/)
  assert.match(editorStyles, /\.pe-nav-preview\s*\{[\s\S]*position:\s*relative/)
  assert.match(
    editorStyles,
    /\.pe-nav-preview::before\s*\{[\s\S]*border-left:[\s\S]*pointer-events:\s*none/
  )
  assert.doesNotMatch(editorSource, /<el-button\b[^>]*\btype="button"/)
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

test('keeps the left toolbar compact without removing its existing groups', () => {
  const toolbarStyle = extractCssBlock(editorStyles, '.pe-tools-panel')
  const toolbarSectionStyle = extractCssBlock(editorStyles, '.pe-tools-panel .pe-tool-section')
  const toolbarHeadingStyle = extractCssBlock(
    editorStyles,
    '.pe-tools-panel .pe-tool-section h2 {'
  )
  const toolbarTypographyStyle = extractCssBlock(
    editorStyles,
    '.pe-tools-panel .pe-tool-section h2,'
  )
  const toolbarControlRowStyle = extractCssBlock(editorStyles, '.pe-tools-panel .pe-control-row')
  const toolbarGridStyle = extractCssBlock(editorStyles, '.pe-tools-panel .pe-tool-grid')
  const toolbarButtonRowStyle = extractCssBlock(editorStyles, '.pe-tools-panel .pe-button-row')
  const toolbarInputStyle = extractCssBlock(
    editorStyles,
    '.pe-tools-panel input:not([type="range"]):not([type="color"])'
  )
  const toolbarIconStyle = extractCssBlock(editorStyles, '.pe-tools-panel .pe-icon-tool')
  const toolbarSvgStyle = extractCssBlock(editorStyles, '.pe-tools-panel .pe-icon-tool svg')
  const selectionGridStyle = extractCssBlock(
    editorStyles,
    '.pe-tool-section--selection .pe-tool-grid'
  )
  const textStyle = extractCssBlock(editorStyles, '.pe-tool-section--text textarea')
  const shortViewportStyle = extractCssBlock(editorStyles, '@media (max-height: 699px)')
  const textareaTag = extractStartTags(editorSource, 'textarea').find((tag) =>
    tag.includes('v-model="textTool.text"')
  )
  const groupMarkers = [
    'pe-tool-section--drawing',
    'pe-tool-section--shapes',
    'pe-tool-section--selection',
    'pe-tool-section--onion',
    'pe-tool-section--text',
    'pe-tools-footer',
  ]

  assert.match(toolbarStyle, /font-size:\s*12px/)
  assert.match(toolbarStyle, /overflow:\s*hidden/)
  assert.match(toolbarTypographyStyle, /font-size:\s*12px/)
  assert.doesNotMatch(toolbarTypographyStyle, /font-weight\s*:/)
  assert.match(toolbarSectionStyle, /padding:\s*3px 8px/)
  assert.match(toolbarHeadingStyle, /margin-bottom:\s*3px/)
  assert.match(toolbarHeadingStyle, /line-height:\s*1\.2/)
  assert.doesNotMatch(toolbarHeadingStyle, /font-weight\s*:/)
  assert.match(toolbarControlRowStyle, /gap:\s*5px/)
  assert.match(toolbarControlRowStyle, /margin-top:\s*4px/)
  assert.match(toolbarGridStyle, /gap:\s*4px/)
  assert.match(toolbarButtonRowStyle, /gap:\s*5px/)
  assert.match(toolbarButtonRowStyle, /margin-top:\s*4px/)
  assert.match(toolbarInputStyle, /height:\s*28px/)
  assert.match(toolbarInputStyle, /min-height:\s*28px/)
  assert.match(toolbarInputStyle, /padding:\s*4px 6px/)
  assert.match(toolbarIconStyle, /min-height:\s*32px/)
  assert.match(toolbarSvgStyle, /width:\s*15px/)
  assert.match(toolbarSvgStyle, /height:\s*15px/)
  assert.match(selectionGridStyle, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/)
  assert.ok(textareaTag)
  assert.match(textareaTag, /rows="1"/)
  assert.match(textareaTag, /wrap="off"/)
  assert.match(textStyle, /white-space:\s*nowrap/)
  assert.match(textStyle, /overflow-x:\s*auto/)
  assert.match(textStyle, /overflow-y:\s*hidden/)
  assert.match(textStyle, /resize:\s*none/)
  assert.match(shortViewportStyle, /\.pe-tools-panel\s*\{[^}]*overflow-y:\s*auto/s)

  const groupIndexes = groupMarkers.map((marker) => editorSource.indexOf(marker))
  assert.ok(groupIndexes.every((index) => index >= 0))
  assert.deepEqual(groupIndexes, [...groupIndexes].sort((left, right) => left - right))
})

test('keeps pixel text alignment buttons compact and behaviorally unchanged', () => {
  const textAlignmentButtonStyle = extractCssBlock(
    editorStyles,
    '.pe-tool-section--text .pe-button-row--three .pe-secondary'
  )

  assert.match(textAlignmentButtonStyle, /padding:\s*4px 11px/)
  assert.doesNotMatch(textAlignmentButtonStyle, /width\s*:|grid-template-columns/)
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
  assert.match(editorCanvasTag, /:width="EDITOR_CANVAS_WIDTH"/)
  assert.match(editorCanvasTag, /:height="EDITOR_CANVAS_HEIGHT"/)
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

test('zooms only the central Canvas from 50 to 300 percent', () => {
  const editorCanvasTag = editorSource.match(/<canvas\s+[^>]*ref="editorCanvasRef"[^>]*>/)?.[0]

  assert.ok(editorCanvasTag)
  assert.match(editorSource, /const CANVAS_ZOOM_MIN = 50/)
  assert.match(editorSource, /const CANVAS_ZOOM_MAX = 300/)
  assert.match(editorSource, /const CANVAS_ZOOM_STEP = 10/)
  assert.match(editorSource, /const EDITOR_CANVAS_WIDTH = 960/)
  assert.match(editorSource, /const EDITOR_CANVAS_HEIGHT = 480/)
  assert.match(editorSource, /const canvasZoom = ref<number>\(100\)/)
  assert.match(editorSource, /class="pe-canvas-zoom"/)
  assert.match(editorSource, /@input="handleCanvasZoomInput"/)
  assert.match(editorSource, /@click="handleAdjustCanvasZoom\(-CANVAS_ZOOM_STEP\)"/)
  assert.match(editorSource, /@click="handleAdjustCanvasZoom\(CANVAS_ZOOM_STEP\)"/)
  assert.match(editorSource, /<output[^>]*>\{\{ canvasZoom \}\}%<\/output>/)
  assert.match(editorCanvasTag, /:style="canvasZoomStyle"/)
  assert.match(editorCanvasTag, /:width="EDITOR_CANVAS_WIDTH"/)
  assert.match(editorCanvasTag, /:height="EDITOR_CANVAS_HEIGHT"/)
})

test('keeps Canvas zoom bounded, accessible, and isolated to its viewport', () => {
  const zoomControl = editorSource.match(
    /<div\s+[^>]*class="pe-canvas-zoom"[^>]*>[\s\S]*?<\/div>/
  )?.[0]
  const viewportStyle = extractCssBlock(editorStyles, '.pe-canvas-viewport')
  const canvasStyle = extractCssBlock(editorStyles, '.pe-canvas-viewport canvas')
  const canvasZoomStyle = extractBraceBlock(
    editorSource,
    'const canvasZoomStyle = computed(() => ({'
  )
  const setCanvasZoom = extractBraceBlock(editorSource, 'function handleSetCanvasZoom')
  const canvasPoint = extractBraceBlock(editorSource, 'function canvasPoint')
  const layoutStyles = [
    '.pe-editor-grid',
    '.pe-tools-panel',
    '.pe-layers-panel',
    '.pe-frame-panel',
  ].map((selector) => extractCssBlock(editorStyles, selector))
  const editorGridStyle = extractCssBlock(editorStyles, '.pe-editor-grid')
  const overviewControl = editorSource.match(
    /<div class="pe-canvas-overview">[\s\S]*?<\/section>/
  )?.[0]

  assert.ok(zoomControl)
  assert.match(zoomControl, /role="group"/)
  assert.match(zoomControl, /:aria-label="t\('common\.pxm_editor_zoom'\)"/)
  assert.match(zoomControl, /:disabled="canvasZoom <= CANVAS_ZOOM_MIN"/)
  assert.match(zoomControl, /pxm_editor_zoom_out/)
  assert.match(zoomControl, /type="range"/)
  assert.match(zoomControl, /:min="CANVAS_ZOOM_MIN"/)
  assert.match(zoomControl, /:max="CANVAS_ZOOM_MAX"/)
  assert.match(zoomControl, /:step="CANVAS_ZOOM_STEP"/)
  assert.match(zoomControl, /@input="handleCanvasZoomInput"/)
  assert.match(zoomControl, /:disabled="canvasZoom >= CANVAS_ZOOM_MAX"/)
  assert.match(zoomControl, /pxm_editor_zoom_in/)
  assert.match(zoomControl, /<output aria-live="polite">\{\{ canvasZoom \}\}%<\/output>/)
  assert.match(canvasZoomStyle, /width:\s*`\$\{canvasZoom\.value\}%`/)
  assert.match(
    canvasZoomStyle,
    /maxWidth:\s*`\$\{EDITOR_CANVAS_WIDTH \* \(canvasZoom\.value \/ 100\)\}px`/
  )
  assert.doesNotMatch(canvasZoomStyle, /overviewZoom/)
  assert.match(setCanvasZoom, /const numeric = Number\(value\)/)
  assert.match(setCanvasZoom, /if \(!Number\.isFinite\(numeric\)\) return/)
  assert.match(
    setCanvasZoom,
    /canvasZoom\.value = Math\.max\(CANVAS_ZOOM_MIN, Math\.min\(CANVAS_ZOOM_MAX, numeric\)\)/
  )
  assert.match(editorSource, /event\.target instanceof HTMLInputElement/)
  assert.match(canvasPoint, /const rect = canvas\.getBoundingClientRect\(\)/)
  assert.match(
    canvasPoint,
    /const x = Math\.floor\(\(\(event\.clientX - rect\.left\) \/ rect\.width\) \* WIDTH\)/
  )
  assert.match(
    canvasPoint,
    /const y = Math\.floor\(\(\(event\.clientY - rect\.top\) \/ rect\.height\) \* HEIGHT\)/
  )
  assert.doesNotMatch(canvasPoint, /canvasZoom|CANVAS_ZOOM/)
  assert.match(viewportStyle, /display:\s*flex/)
  assert.match(viewportStyle, /align-items:\s*safe center/)
  assert.match(viewportStyle, /justify-content:\s*safe center/)
  assert.match(viewportStyle, /overflow:\s*auto/)
  assert.match(
    editorGridStyle,
    /grid-template-rows:\s*minmax\(0,\s*1fr\) clamp\(144px,\s*22vh,\s*170px\)/
  )
  assert.match(canvasStyle, /flex:\s*0 0 auto/)
  assert.match(canvasStyle, /max-width:\s*none/)
  assert.doesNotMatch(canvasStyle, /width:\s*min\(/)
  for (const layoutStyle of layoutStyles) {
    assert.doesNotMatch(layoutStyle, /canvasZoom|canvas[-_]zoom|CANVAS_ZOOM|--[^;]*zoom/i)
  }
  assert.ok(overviewControl)
  assert.match(overviewControl, /\{\{ overviewZoom\.toFixed\(2\) \}\}x/)
  assert.match(overviewControl, /:value="overviewZoom"/)
  assert.match(overviewControl, /@input="handleSetOverviewZoom\(\$event\.target\.value\)"/)
  assert.doesNotMatch(overviewControl, /canvasZoom/)

  for (const localeSource of localeSources) {
    assert.match(localeSource, /pxm_editor_zoom_out\s*:/)
    assert.match(localeSource, /pxm_editor_zoom_in\s*:/)
  }
})

test('fills the desktop editor viewport while preserving local overflow owners', () => {
  const editorScrollStyle = extractCssBlock(editorStyles, '.pe-editor-scroll')
  const editorGridStyle = extractCssBlock(editorStyles, '.pe-editor-grid')
  const canvasPanelStyle = extractCssBlock(editorStyles, '.pe-canvas-panel')
  const canvasViewportStyle = extractCssBlock(editorStyles, '.pe-canvas-viewport')
  const layersPanelStyle = extractCssBlock(editorStyles, '.pe-layers-panel')
  const framePanelStyle = extractCssBlock(editorStyles, '.pe-frame-panel')
  const framesListStyle = extractCssBlock(editorStyles, '.pe-frames-list')
  const shortHeightStyle = extractCssBlock(editorStyles, '@media (max-height: 699px)')

  assert.match(editorScrollStyle, /height:\s*calc\(100vh - var\(--pe-nav-height\)\)/)
  assert.match(editorScrollStyle, /min-height:\s*0/)
  assert.match(editorScrollStyle, /overflow:\s*hidden/)
  assert.match(editorGridStyle, /height:\s*100%/)
  assert.match(editorGridStyle, /min-height:\s*0/)
  assert.match(
    editorGridStyle,
    /grid-template-rows:\s*minmax\(0,\s*1fr\) clamp\(144px,\s*22vh,\s*170px\)/
  )
  assert.match(canvasPanelStyle, /min-height:\s*0/)
  assert.match(layersPanelStyle, /min-height:\s*0/)
  assert.match(framePanelStyle, /min-height:\s*0/)
  assert.match(framePanelStyle, /overflow:\s*hidden/)
  assert.match(canvasViewportStyle, /overflow:\s*auto/)
  assert.match(layersPanelStyle, /overflow:\s*auto/)
  assert.match(framesListStyle, /overflow-x:\s*auto/)
  assert.match(framesListStyle, /overflow-y:\s*hidden/)
  assert.match(shortHeightStyle, /\.pe-editor-scroll\s*\{[^}]*height:\s*auto[^}]*overflow:\s*visible/s)
  assert.match(shortHeightStyle, /\.pe-editor-grid\s*\{[^}]*height:\s*auto[^}]*grid-template-rows:\s*526px auto/s)
  assert.match(shortHeightStyle, /\.pe-canvas-panel,\s*\.pe-layers-panel\s*\{[^}]*min-height:\s*526px/s)
  assert.match(shortHeightStyle, /\.pe-frame-panel\s*\{[^}]*overflow:\s*visible/s)
})

test('contains Canvas wheel gestures and preserves the pointer anchor', () => {
  const editorCanvasTag = editorSource.match(/<canvas\s+[^>]*ref="editorCanvasRef"[^>]*>/)?.[0]
  const wheelHandler = extractBraceBlock(editorSource, 'async function handleCanvasWheel')
  const canvasStyle = extractCssBlock(editorStyles, '.pe-canvas-viewport canvas')

  assert.ok(editorCanvasTag)
  assert.match(editorSource, /ref="canvasViewportRef"/)
  assert.match(editorCanvasTag, /@wheel="handleCanvasWheel"/)
  assert.doesNotMatch(editorCanvasTag, /@wheel\.passive/)
  assert.match(
    wheelHandler,
    /^async function handleCanvasWheel\(event: WheelEvent\): Promise<void> \{\s*event\.preventDefault\(\)/
  )
  assert.match(wheelHandler, /if \(event\.deltaY === 0\) return/)
  assert.match(
    wheelHandler,
    /event\.deltaY < 0 \? CANVAS_ZOOM_STEP : -CANVAS_ZOOM_STEP/
  )
  assert.match(
    wheelHandler,
    /Math\.max\(\s*CANVAS_ZOOM_MIN,\s*Math\.min\(CANVAS_ZOOM_MAX,\s*canvasZoom\.value \+ delta\)\s*\)/
  )
  assert.match(wheelHandler, /if \(nextZoom === canvasZoom\.value\) return/)
  assert.match(wheelHandler, /const rect = canvas\.getBoundingClientRect\(\)/)
  assert.match(
    wheelHandler,
    /const anchorX = \(event\.clientX - rect\.left\) \/ rect\.width/
  )
  assert.match(
    wheelHandler,
    /const anchorY = \(event\.clientY - rect\.top\) \/ rect\.height/
  )
  assert.match(wheelHandler, /handleSetCanvasZoom\(nextZoom\)/)
  assert.match(wheelHandler, /await nextTick\(\)/)
  assert.match(wheelHandler, /const nextRect = canvas\.getBoundingClientRect\(\)/)
  assert.match(
    wheelHandler,
    /viewport\.scrollLeft \+= nextRect\.left \+ anchorX \* nextRect\.width - event\.clientX/
  )
  assert.match(
    wheelHandler,
    /viewport\.scrollTop \+= nextRect\.top \+ anchorY \* nextRect\.height - event\.clientY/
  )
  assert.doesNotMatch(wheelHandler, /overviewZoom/)
  assert.doesNotMatch(wheelHandler, /event\.(?:ctrlKey|metaKey)/)
  assert.match(canvasStyle, /cursor:\s*grab/)
  assert.ok(
    wheelHandler.indexOf('event.preventDefault()')
      < wheelHandler.indexOf('if (event.deltaY === 0) return')
  )
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
