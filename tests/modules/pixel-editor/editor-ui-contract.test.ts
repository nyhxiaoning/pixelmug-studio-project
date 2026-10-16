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
  '../../../src/locales/ko-KR/common.ts',
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

test('allows deleting layers down to one layer', () => {
  const deleteLayerHandler = extractBraceBlock(
    editorSource,
    'function handleDeleteLayer(index: number): void'
  )
  const deleteLayerButton = extractStartTags(editorSource, 'button').find((tag) =>
    tag.includes('pe-layer-action--danger')
  )

  assert.match(deleteLayerHandler, /layers\.length <= 1/)
  assert.ok(deleteLayerButton)
  assert.match(deleteLayerButton, /:disabled="currentFrame\.layers\.length <= 1"/)
})

test('enforces the project frame limit before adding, duplicating, or importing frames', () => {
  const addHandler = extractBraceBlock(editorSource, 'function handleAddFrame(): void')
  const duplicateHandler = extractBraceBlock(editorSource, 'function handleDuplicateFrame(): void')
  const importHandler = extractBraceBlock(
    editorSource,
    'async function handleLoadGifImage(event: Event): Promise<void>'
  )

  assert.match(editorSource, /MAX_PROJECT_FRAMES/)
  assert.match(editorSource, /frameCountAfterReplacement/)
  assert.match(editorSource, /pxm_editor_frame_limit/)
  for (const handler of [addHandler, duplicateHandler]) {
    assert.match(handler, /frames\.length >= MAX_PROJECT_FRAMES/)
    assert.match(
      handler,
      /\{\s*if \(project\.value\.frames\.length >= MAX_PROJECT_FRAMES\) \{\s*showFrameLimit\(\)\s*return\s*\}\s*snapshot\(\)/
    )
  }
  assert.match(importHandler, /frameCountAfterReplacement\(/)
  assert.match(importHandler, /> MAX_PROJECT_FRAMES/)
  assert.match(
    importHandler,
    /await decodeGifFrames\(file\)\s*const projectedFrameCount = frameCountAfterReplacement\(\s*project\.value\.frames\.length,\s*selectedFrameIndex,\s*gifFrames\.length\s*\)\s*if \(projectedFrameCount > MAX_PROJECT_FRAMES\) \{\s*showFrameLimit\(\)\s*return\s*\}\s*snapshot\(\)/
  )
  assert.ok(importHandler.indexOf('snapshot()') < importHandler.indexOf('gifFrames.map('))
  assert.ok(importHandler.indexOf('gifFrames.map(') < importHandler.indexOf('replaceFramesFromIndex('))
})

test('defines the localized frame limit status in every supported locale', () => {
  const limitHandler = extractBraceBlock(editorSource, 'function showFrameLimit(): void')

  assert.match(
    limitHandler,
    /status\.value = t\('common\.pxm_editor_frame_limit', \{ n: MAX_PROJECT_FRAMES \}\)/
  )
  for (const localeSource of localeSources) {
    assert.match(localeSource, /pxm_editor_frame_limit\s*:\s*'[^'\n]*\{n\}[^'\n]*'/)
  }
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

  assert.ok(toolsIndex >= 0)
  assert.ok(toolsIndex < shapesIndex)
  assert.ok(shapesIndex < selectionIndex)
  assert.ok(selectionIndex < onionIndex)
  assert.ok(onionIndex < textIndex)
  assert.equal(editorSource.includes('pe-tools-footer'), false)
  assert.equal(editorSource.includes('pe-export-settings'), false)
  assert.match(editorSource, /<component\s+:is="toolIcon\(tool\.id\)"/)
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
  ]

  assert.match(toolbarStyle, /font-size:\s*12px/)
  assert.match(toolbarStyle, /overflow:\s*hidden/)
  assert.match(toolbarTypographyStyle, /font-size:\s*12px/)
  assert.doesNotMatch(toolbarTypographyStyle, /font-weight\s*:/)
  assert.match(toolbarSectionStyle, /padding:\s*clamp\(4px, 1vh, 10px\) 8px/)
  assert.match(toolbarHeadingStyle, /margin-bottom:\s*clamp\(3px, 0\.7vh, 7px\)/)
  assert.match(toolbarHeadingStyle, /line-height:\s*1\.2/)
  assert.doesNotMatch(toolbarHeadingStyle, /font-weight\s*:/)
  assert.match(toolbarControlRowStyle, /gap:\s*clamp\(4px, 0\.7vh, 7px\)/)
  assert.match(toolbarControlRowStyle, /margin-top:\s*clamp\(4px, 0\.85vh, 8px\)/)
  assert.match(toolbarGridStyle, /gap:\s*clamp\(4px, 0\.7vh, 7px\)/)
  assert.match(toolbarButtonRowStyle, /gap:\s*clamp\(4px, 0\.7vh, 7px\)/)
  assert.match(toolbarButtonRowStyle, /margin-top:\s*clamp\(4px, 0\.85vh, 8px\)/)
  assert.match(toolbarInputStyle, /height:\s*clamp\(28px, 3\.4vh, 30px\)/)
  assert.match(toolbarInputStyle, /min-height:\s*clamp\(28px, 3\.4vh, 30px\)/)
  assert.match(toolbarInputStyle, /padding:\s*5px 6px/)
  assert.match(toolbarIconStyle, /min-height:\s*clamp\(30px, 4vh, 34px\)/)
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
  assert.match(shortViewportStyle, /\.pe-tools-panel\s*\{[^}]*overflow:\s*hidden/s)

  const groupIndexes = groupMarkers.map((marker) => editorSource.indexOf(marker))
  assert.ok(groupIndexes.every((index) => index >= 0))
  assert.deepEqual(groupIndexes, [...groupIndexes].sort((left, right) => left - right))
})

test('shows the drawing color value and swatch in one compact row', () => {
  const colorRow = editorSource.match(
    /<div[\s\S]*?class="pe-control-row pe-color-row"\s*>[\s\S]*?<\/div>\s*<Teleport/
  )?.[0]

  assert.ok(colorRow)
  const labelIndex = colorRow.indexOf('<label')
  const hexIndex = colorRow.indexOf('class="pe-hex-input"')
  const swatchIndex = colorRow.indexOf('class="pe-color-swatch"')

  assert.ok(labelIndex >= 0 && hexIndex > labelIndex && swatchIndex > hexIndex)
  assert.equal((colorRow.match(/v-model="currentColor"/g) || []).length, 1)
  assert.match(colorRow, /class="pe-hex-input"[\s\S]*maxlength="7"/)
  assert.match(colorRow, /type="button"[\s\S]*class="pe-color-swatch"/)
  assert.match(colorRow, /<label[\s\S]*common\.pxm_editor_color/)

  const rowStyle = extractCssBlock(editorStyles, '.pe-color-row')
  const hexStyle = extractCssBlock(editorStyles, '.pe-color-row .pe-hex-input')
  const swatchStyle = extractCssBlock(editorStyles, '.pe-color-row .pe-color-swatch')

  assert.match(rowStyle, /display:\s*flex/)
  assert.match(rowStyle, /flex-wrap:\s*nowrap/)
  assert.match(hexStyle, /flex:\s*1 1 auto/)
  assert.match(hexStyle, /width:\s*auto/)
  assert.match(swatchStyle, /width:\s*24px/)
  assert.match(swatchStyle, /height:\s*24px/)
  assert.match(swatchStyle, /flex:\s*0 0 24px/)
})

test('keeps the color label and closes the controlled picker safely', () => {
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

  const keydownBlock = extractBraceBlock(editorSource, 'function handleKeydown')
  const pickerEscapeIndex = keydownBlock.indexOf("key === 'escape' && colorPickerOpen.value")
  const typingGuardIndex = keydownBlock.indexOf('if (isTypingTarget(event.target)) return')
  assert.ok(pickerEscapeIndex >= 0 && pickerEscapeIndex < typingGuardIndex)

  const outsidePointerBlock = extractBraceBlock(
    editorSource,
    'function handleColorPickerOutsidePointer'
  )
  const outsideGuardIndex = outsidePointerBlock.indexOf(
    'if (!colorPickerOpen.value || !(event.target instanceof Node)) return'
  )
  const controlGuardIndex = outsidePointerBlock.indexOf(
    'if (colorControlRef.value?.contains(event.target)) return'
  )
  const popoverGuardIndex = outsidePointerBlock.indexOf(
    'if (colorPopoverRef.value?.contains(event.target)) return'
  )
  const outsideCloseIndex = outsidePointerBlock.indexOf('handleCloseColorPicker(false)')
  assert.ok(
    outsideGuardIndex >= 0 &&
      outsideGuardIndex < controlGuardIndex &&
      controlGuardIndex < popoverGuardIndex &&
      popoverGuardIndex < outsideCloseIndex
  )

  const positionBlock = extractBraceBlock(editorSource, 'function positionColorPopover')
  assert.match(positionBlock, /const triggerRect = trigger\.getBoundingClientRect\(\)/)
  assert.match(positionBlock, /const popoverRect = popover\.getBoundingClientRect\(\)/)
  assert.match(positionBlock, /const viewportGap = 8/)
  assert.match(
    positionBlock,
    /Math\.min\(\s*window\.innerWidth - popoverRect\.width - viewportGap,[\s\S]*Math\.max\(viewportGap, preferredLeft\)/
  )
  assert.match(positionBlock, /const below = triggerRect\.bottom \+ 6/)
  assert.match(
    positionBlock,
    /below \+ popoverRect\.height <= window\.innerHeight - viewportGap/
  )
  assert.match(
    positionBlock,
    /Math\.max\(viewportGap, triggerRect\.top - popoverRect\.height - 6\)/
  )

  const closeBlock = extractBraceBlock(editorSource, 'function handleCloseColorPicker')
  assert.match(closeBlock, /colorPickerOpen\.value = false/)
  assert.match(
    closeBlock,
    /if \(restoreFocus\) nextTick\(\(\) => colorSwatchButtonRef\.value\?\.focus\(\)\)/
  )

  for (const source of localeSources) {
    assert.match(source, /pxm_editor_close_color_picker:/)
  }
})

test('keeps toolbar groups in normal flow at every viewport height', () => {
  const toolbarStyle = extractCssBlock(editorStyles, '.pe-tools-panel')
  const shortViewportStyle = extractCssBlock(editorStyles, '@media (max-height: 699px)')

  assert.equal(editorStyles.match(/@media\s*\(min-height:\s*800px\)/g)?.length ?? 0, 0)
  assert.doesNotMatch(toolbarStyle, /display:\s*flex|justify-content:\s*space-between/)
  assert.match(shortViewportStyle, /\.pe-tools-panel\s*\{[^}]*overflow:\s*hidden/s)
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
    /grid-template-rows:\s*minmax\(0,\s*1fr\) clamp\(160px,\s*22vh,\s*170px\)/
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
    /grid-template-rows:\s*minmax\(0,\s*1fr\) clamp\(160px,\s*22vh,\s*170px\)/
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

test('aligns the frame interval and action icons without changing behavior', () => {
  const frameDelayStyle = extractCssBlock(editorStyles, '.pe-frame-delay {')
  const frameDelayInputStyle = extractCssBlock(editorStyles, '.pe-frame-delay-input {')
  const frameActionStyle = extractCssBlock(editorStyles, '.pe-app-shell .pe-frame-action {')
  const frameActionIconStyle = extractCssBlock(editorStyles, '.pe-frame-action > svg {')
  const frameDangerActionStyle = extractCssBlock(editorStyles, '.pe-app-shell .pe-frame-action--danger {')
  const frameControls = editorSource.match(
    /<div class="pe-frame-controls">[\s\S]*?<div class="pe-frame-content">/
  )?.[0]

  assert.match(frameDelayStyle, /grid-template-columns:\s*auto minmax\(0,\s*1fr\)\s*;/)
  assert.match(frameDelayStyle, /align-items:\s*center/)
  assert.match(frameDelayInputStyle, /min-width:\s*0/)
  assert.match(frameDelayInputStyle, /align-items:\s*center/)
  assert.match(frameActionStyle, /display:\s*inline-flex/)
  assert.match(frameActionStyle, /align-items:\s*center/)
  assert.match(frameActionStyle, /justify-content:\s*center/)
  assert.match(frameActionStyle, /line-height:\s*0/)
  assert.match(frameActionStyle, /padding:\s*0/)
  assert.match(frameActionStyle, /color:\s*var\(--pe-text\)/)
  assert.doesNotMatch(frameActionStyle, /transform|translate|position\s*:\s*relative|(?:^|[;{])\s*(?:top|bottom)\s*:/)
  assert.match(frameActionIconStyle, /display:\s*block/)
  assert.match(frameActionIconStyle, /flex:\s*0 0 auto/)
  assert.doesNotMatch(frameActionIconStyle, /transform|translate|position\s*:\s*relative|(?:^|[;{])\s*(?:top|bottom)\s*:/)
  assert.match(frameDangerActionStyle, /color:\s*var\(--pe-danger\)/)
  assert.doesNotMatch(editorStyles, /(?:^|\n)\s*svg\s*\{/)
  assert.doesNotMatch(editorStyles, /(?:^|\n)\.pe-frame-action\s*\{/)
  assert.ok(frameControls)
  assert.match(frameControls, /@click="handleTogglePreview"/)
  assert.match(frameControls, /@click="handleAddFrame"/)
  assert.match(frameControls, /@click="handleDuplicateFrame"/)
  assert.match(frameControls, /@click="handleDeleteFrame"/)
  assert.match(frameControls, /:disabled="project\.frames\.length <= 1"/)
  assert.equal(frameControls.match(/class="pe-frame-action(?: pe-frame-action--danger)?"/g)?.length, 4)
})

test('shows complete frame thumbnails in a full-width horizontal strip', () => {
  const frameContentStyle = extractCssBlock(editorStyles, '.pe-frame-content')
  const framesListStyle = extractCssBlock(editorStyles, '.pe-frames-list')
  const frameItemStyle = extractCssBlock(editorStyles, '.pe-frame-item')
  const frameCanvasStyle = extractCssBlock(editorStyles, '.pe-frame-item canvas')
  const frameCanvasTag = editorSource.match(
    /<canvas\s+[^>]*:ref="\(el\) => setFrameThumbRef\(frame\.id, el\)"[^>]*>/
  )?.[0]

  assert.match(frameContentStyle, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/)
  assert.doesNotMatch(frameContentStyle, /minmax\(180px,\s*240px\)/)
  assert.match(framesListStyle, /overflow-x:\s*auto/)
  assert.match(framesListStyle, /overflow-y:\s*hidden/)
  assert.match(frameItemStyle, /flex:\s*0 0 186px/)
  assert.match(frameItemStyle, /grid-template-rows:\s*auto auto/)
  assert.doesNotMatch(frameItemStyle, /grid-template-rows:[^;]*74px/)
  assert.match(frameCanvasStyle, /display:\s*block/)
  assert.match(frameCanvasStyle, /width:\s*100%/)
  assert.match(frameCanvasStyle, /height:\s*auto/)
  assert.match(frameCanvasStyle, /aspect-ratio:\s*2\s*\/\s*1/)
  assert.doesNotMatch(frameCanvasStyle, /object-fit:\s*cover/)
  assert.ok(frameCanvasTag)
  assert.match(frameCanvasTag, /width="96"/)
  assert.match(frameCanvasTag, /height="48"/)
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
  assert.match(editorStyles, /grid-template-columns:\s*24px minmax\(0, 1fr\) 58px 24px 24px/)
})

test('prioritizes one-line layer titles with compact controls', () => {
  const layerItemStyle = extractCssBlock(editorStyles, '.pe-layer-item')
  const layerSelectStyle = extractCssBlock(editorStyles, '.pe-app-shell .pe-layer-select')
  const layerOpacityStyle = extractCssBlock(editorStyles, '.pe-layer-opacity')
  const layerOpacityInputStyle = extractCssBlock(editorStyles, '.pe-layer-opacity input')
  const layerActionStyle = extractCssBlock(
    editorStyles,
    '.pe-app-shell .pe-layer-visibility,'
  )
  const layerIconStyle = extractCssBlock(editorStyles, '.pe-layer-visibility svg,')
  const layerDangerStyle = extractCssBlock(
    editorStyles,
    '.pe-app-shell .pe-layer-action--danger',
  )
  const layerTitleStyle = extractCssBlock(
    editorStyles,
    '.pe-layers-panel .pe-panel-title-row h2,'
  )

  assert.match(
    layerItemStyle,
    /grid-template-columns:\s*24px minmax\(0,\s*1fr\) 58px 24px 24px\s*;/,
  )
  assert.match(layerItemStyle, /gap:\s*4px/)
  assert.match(layerSelectStyle, /font-size:\s*12px/)
  assert.match(layerSelectStyle, /white-space:\s*nowrap/)
  assert.match(layerSelectStyle, /overflow:\s*hidden/)
  assert.match(layerSelectStyle, /text-overflow:\s*ellipsis/)
  assert.match(layerOpacityStyle, /width:\s*58px/)
  assert.match(layerOpacityStyle, /font-size:\s*12px/)
  assert.match(layerOpacityInputStyle, /height:\s*28px/)
  assert.match(layerActionStyle, /width:\s*24px/)
  assert.match(layerActionStyle, /height:\s*24px/)
  assert.match(layerActionStyle, /padding:\s*0/)
  assert.match(layerIconStyle, /width:\s*14px/)
  assert.match(layerIconStyle, /height:\s*14px/)
  assert.match(layerDangerStyle, /color:\s*var\(--pe-danger\)/)
  assert.match(layerTitleStyle, /font-size:\s*12px/)
  assert.match(editorSource, /class="pe-layer-select"[\s\S]*?:title="layer\.name"/)
  assert.match(editorSource, /class="pe-layer-select"[\s\S]*?:aria-label="layer\.name"/)
  assert.match(editorSource, /@click="handleSelectLayer\(index\)"/)
  assert.match(editorSource, /@click\.stop="handleDuplicateLayer\(index\)"/)
  assert.match(editorSource, /@click\.stop="handleDeleteLayer\(index\)"/)
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
  assert.match(
    editorSource,
    /function handleCommitFrameDelay\(\): void \{[\s\S]*?project\.value\.frames\.forEach\(\(frame\) => \{\s*frame\.delay = delay\s*\}\)/
  )
  assert.match(editorSource, /:ref="\(el\) => setFrameThumbRef\(frame\.id, el\)"/)
  assert.match(editorSource, /@click="handleSelectFrame\(index\)"/)
  assert.match(editorSource, /@dragstart="handleStartFrameDrag\(index, \$event\)"/)
  assert.match(editorSource, /@dragover\.prevent="handleDragOverFrame\(index, \$event\)"/)
  assert.match(editorSource, /@dragleave="dragOverFrameIndex = null"/)
  assert.match(editorSource, /@drop\.prevent="handleDropFrame\(index\)"/)
  assert.match(editorSource, /@dragend="handleEndFrameDrag"/)
  assert.match(editorSource, /ref="editorCanvasRef"[\s\S]*?:aria-busy="previewPlaying"/)
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

test('crops static images at a 2:1 ratio before pixelizing to 32x16', () => {
  assert.match(editorSource, /v-if="importDialog\.open"/)
  assert.match(editorSource, /<span>\{\{ t\('common\.pxm_editor_import_crop'\) \}\} · 2:1<\/span>/)
  assert.match(editorSource, /<option value="contain">/)
  assert.match(editorSource, /<option value="cover">/)
  assert.doesNotMatch(editorSource, /<option value="stretch">/)
  assert.doesNotMatch(editorSource, /handleStaticFileInputClick/)

  const loadBlock = editorSource.slice(
    editorSource.indexOf('async function handleLoadStaticImage'),
    editorSource.indexOf('function handleResetImportCrop')
  )
  assert.match(loadBlock, /await imageFromFile\(file\)/)
  assert.match(loadBlock, /importDialog\.open\s*=\s*true/)
  assert.match(loadBlock, /Math\.abs\(ratio - 2\) < 0\.15/)

  const applyBlock = editorSource.slice(
    editorSource.indexOf('function handleApplyImportToLayer'),
    editorSource.indexOf('async function handleLoadGifImage')
  )
  assert.match(applyBlock, /outputWidth:\s*WIDTH/)
  assert.match(applyBlock, /outputHeight:\s*HEIGHT/)
  assert.match(
    applyBlock,
    /layer\.canvasPixels\s*=\s*localPixelsToCanvasPixels\(pixels, viewportX, viewportY\)/
  )
  assert.match(applyBlock, /refreshLayerVisibleFromCanvas\(/)

  const commandBlock = editorSource.slice(
    editorSource.indexOf('function handleImportCommand'),
    editorSource.indexOf('function handleExportCommand')
  )
  assert.match(commandBlock, /staticFileInputRef\.value\?\.click\(\)/)
  assert.doesNotMatch(commandBlock, /handleStaticFileInputClick/)
})

test('uploads static images from the same contain-fitted pixels used by the editor', () => {
  const worksSource = readFileSync(
    new URL('../../../src/pages/works/index.vue', import.meta.url),
    'utf8'
  )
  const uploadSource = readFileSync(
    new URL('../../../src/lib/images/uploadFile.ts', import.meta.url),
    'utf8'
  )

  assert.match(worksSource, /uploadStaticImageWithJson\(file, projectData, pixels\)/)
  assert.match(uploadSource, /pixels:\s*ReadonlyArray<string \| null \| undefined>/)
  assert.match(uploadSource, /const rgb565Blob = colorsToBlob\(normalizedPixels\)/)
  assert.match(uploadSource, /convertHexArrayToPng\(\s*normalizedPixels/)
  assert.doesNotMatch(
    uploadSource,
    /uploadStaticImageWithJson[\s\S]*?convertImageToRGB565\(file/
  )
})

test('allows rejected publish items to be deleted', () => {
  const publishSource = readFileSync(
    new URL('../../../src/pages/publish/index.vue', import.meta.url),
    'utf8'
  )

  const rejectedBlock = publishSource.slice(
    publishSource.indexOf("row.status === 'rejected'"),
    publishSource.indexOf("row.status === 'offline'")
  )
  assert.match(rejectedBlock, /pxm_action_delete/)
  assert.match(rejectedBlock, /@click="handleDeleteRejected\(row\)"/)

  const handlerBlock = publishSource.slice(
    publishSource.indexOf('const handleDeleteRejected'),
    publishSource.indexOf('/** 搜索防抖')
  )
  assert.match(handlerBlock, /pxm_publish_confirm_delete_rejected/)
  assert.match(handlerBlock, /deleteWorkApi\(row\.id\)/)
  assert.match(handlerBlock, /resetTableData\(\)/)
})

test('preserves publish row fields required by publish actions', () => {
  const publishSource = readFileSync(
    new URL('../../../src/pages/publish/index.vue', import.meta.url),
    'utf8'
  )

  const rowMapper = publishSource.slice(
    publishSource.indexOf('function toTableRow(api)'),
    publishSource.indexOf('// 主表格列表')
  )
  assert.match(rowMapper, /hasWork:\s*api\.hasWork/)
  assert.match(rowMapper, /contentConsistent:\s*api\.contentConsistent\s*\?\?\s*api\.contentConsitent/)
  assert.match(rowMapper, /tagCode:\s*api\.tagCode/)

  const singlePublishBlock = publishSource.slice(
    publishSource.indexOf('const singlePublish'),
    publishSource.indexOf('/** f. 已上架')
  )
  assert.match(singlePublishBlock, /return submitWorkApi\(row\.id,\s*\{\s*tagCode:\s*row\.tagCode\s*\}\)/)
  assert.doesNotMatch(singlePublishBlock, /console\.log\(|return;\s*\n\s*alert\(/)
})

test('device selected state is initialized from the API and synchronized on change', () => {
  const worksSource = readFileSync(
    new URL('../../../src/pages/works/index.vue', import.meta.url),
    'utf8'
  )
  const deviceSource = readFileSync(
    new URL('../../../src/api/device.ts', import.meta.url),
    'utf8'
  )

  assert.match(deviceSource, /export interface CreatorDeviceVO[\s\S]*selected\?:\s*boolean/)
  assert.match(
    worksSource,
    /<el-checkbox-group v-model="selectedDeviceIds" @change="handleDeviceSelectionChange">/
  )
  assert.match(
    worksSource,
    /selectedDeviceIds\.value\s*=\s*deviceList\.value\s*\.filter\(\(device\) => device\.selected === true\)\s*\.map\(\(device\) => device\.id\)/
  )
  assert.match(
    worksSource,
    /setSelectedDevicesApi\(deviceId,\s*\{\s*selected:\s*nextIds\.includes\(deviceId\),?\s*\}\)/
  )
  assert.match(worksSource, /selectedDeviceIds\.value\s*=\s*previousIds/)
})

test('plays one animation cycle inside the editor canvas and restores frame one', () => {
  const navStart = editorSource.indexOf('<header class="pe-editor-nav">')
  const navEnd = editorSource.indexOf('</header>', navStart)
  const navBlock = editorSource.slice(navStart, navEnd)
  const frameStart = editorSource.indexOf('<section class="pe-panel pe-frame-panel">')
  const frameEnd = editorSource.indexOf('</main>', frameStart)
  const frameBlock = editorSource.slice(frameStart, frameEnd)
  const playbackButton = extractStartTags(editorSource, 'button').find((candidate) =>
    /@click="handleTogglePreview"/.test(candidate)
  )
  const editorCanvasTag = extractStartTags(editorSource, 'canvas').find((candidate) =>
    /ref="editorCanvasRef"/.test(candidate)
  )
  const canvasViewportTag = extractStartTags(editorSource, 'div').find((candidate) =>
    /ref="canvasViewportRef"/.test(candidate)
  )
  const renderPlayback = extractBraceBlock(
    editorSource,
    'function renderPlaybackFrame(pixels: (string | null)[]): void'
  )
  const finishPlayback = extractBraceBlock(editorSource, 'function finishPreviewPlayback(): void')
  const togglePlayback = extractBraceBlock(editorSource, 'function handleTogglePreview(): void')
  const renderAll = extractBraceBlock(editorSource, 'function renderAll(): void')
  const mountedSetup = extractBraceBlock(editorSource, 'onMounted(() =>')
  const unmountCleanup = extractBraceBlock(editorSource, 'onBeforeUnmount(() =>')
  const playbackCanvasStyle = extractCssBlock(
    editorStyles,
    '.pe-canvas-viewport canvas.is-preview-playing'
  )
  const playbackViewportStyle = extractCssBlock(
    editorStyles,
    '.pe-canvas-viewport.is-preview-playing'
  )

  assert.ok(navStart >= 0 && navEnd > navStart)
  assert.match(navBlock, /@click\.stop="sendWorkToDevice"/)
  assert.doesNotMatch(navBlock, /handleTogglePreview/)
  assert.ok(frameStart >= 0 && frameEnd > frameStart)
  assert.match(frameBlock, /@click="handleTogglePreview"/)
  assert.doesNotMatch(frameBlock, /sendWorkToDevice/)
  assert.ok(playbackButton)
  assert.match(playbackButton, /:disabled="previewPlaying"/)
  assert.match(playbackButton, /:title="t\('common\.pxm_editor_play_all_frames'\)"/)
  assert.match(playbackButton, /:aria-label="t\('common\.pxm_editor_play_all_frames'\)"/)
  assert.doesNotMatch(playbackButton, /pxm_editor_stop_play/)
  assert.ok(editorCanvasTag)
  assert.ok(canvasViewportTag)
  assert.match(canvasViewportTag, /:class="\{ 'is-preview-playing': previewPlaying \}"/)
  assert.match(editorCanvasTag, /:class="\{ 'is-preview-playing': previewPlaying \}"/)
  assert.match(editorCanvasTag, /:aria-busy="previewPlaying"/)
  assert.doesNotMatch(editorSource, /pe-local-preview-popover|previewCanvasRef|renderPreview/)
  assert.doesNotMatch(editorStyles, /pe-local-preview-popover|pe-local-preview-close/)
  assert.match(renderPlayback, /const canvas = editorCanvasRef\.value/)
  assert.match(renderPlayback, /ctx\.clearRect\(0, 0, canvas\.width, canvas\.height\)/)
  assert.match(renderPlayback, /ctx\.fillStyle = '#05070b'/)
  assert.match(renderPlayback, /drawNonEmptyPixels\(ctx, pixels, WIDTH, HEIGHT\)/)
  assert.match(renderAll, /if \(!previewPlaying\.value\) renderEditor\(\)/)
  assert.match(finishPlayback, /if \(previewTimer\.value !== null\) clearTimeout\(previewTimer\.value\)/)
  assert.match(finishPlayback, /previewTimer\.value = null/)
  assert.match(finishPlayback, /previewPlaying\.value = false/)
  assert.match(finishPlayback, /currentFrameIndex\.value = 0/)
  assert.match(finishPlayback, /activeLayer\.value = Math\.min/)
  assert.match(finishPlayback, /renderAll\(\)/)
  assert.match(
    finishPlayback,
    /nextTick\(\(\) => \{\s*if \(!editorMounted\.value\) return\s*centerOverviewOnViewport\(\)\s*\}\)/
  )
  assert.match(togglePlayback, /if \(previewPlaying\.value\) return/)
  assert.doesNotMatch(
    togglePlayback,
    /if \(previewPlaying\.value\) \{\s*finishPreviewPlayback\(\)/
  )
  assert.match(togglePlayback, /let index = 0/)
  assert.match(
    togglePlayback,
    /const playbackFrames = project\.value\.frames\.map\(\(frame\) => \(\{\s*delay: frame\.delay,\s*pixels: compositeFrame\(frame\),\s*\}\)\)/
  )
  assert.match(togglePlayback, /const frame = playbackFrames\[index\]/)
  assert.match(togglePlayback, /renderPlaybackFrame\(frame\.pixels\)/)
  assert.match(togglePlayback, /index >= playbackFrames\.length - 1/)
  assert.doesNotMatch(togglePlayback, /const frame = project\.value\.frames\[index\]/)
  assert.doesNotMatch(togglePlayback, /currentFrameIndex\.value\s*=/)
  assert.match(
    togglePlayback,
    /previewTimer\.value = window\.setTimeout\(\(\) => \{[\s\S]*?if \(index >= playbackFrames\.length - 1\) \{[\s\S]*?finishPreviewPlayback\(\)[\s\S]*?return[\s\S]*?\}[\s\S]*?index \+= 1[\s\S]*?tick\(\)[\s\S]*?\}, frame\.delay\)/
  )
  assert.match(unmountCleanup, /if \(previewTimer\.value !== null\)/)
  assert.match(mountedSetup, /editorMounted\.value = true/)
  assert.match(
    unmountCleanup,
    /editorMounted\.value = false\s*previewPlaying\.value = false/
  )
  assert.match(unmountCleanup, /window\.clearTimeout\(previewTimer\.value\)/)
  assert.match(unmountCleanup, /previewTimer\.value = null/)
  assert.match(playbackCanvasStyle, /pointer-events:\s*none/)
  assert.match(playbackCanvasStyle, /cursor:\s*progress/)
  assert.match(playbackViewportStyle, /cursor:\s*progress/)
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

test('styles the import modal as the remaining reference overlay', () => {
  const backdropStyle = editorStyles.match(/\.pe-modal-backdrop\s*\{[\s\S]*?\n\}/)?.[0]
  const modalStyle = editorStyles.match(/\.pe-modal\s*\{[\s\S]*?\n\}/)?.[0]

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
  assert.doesNotMatch(editorStyles, /pe-local-preview-popover|pe-local-preview-close/)
})
