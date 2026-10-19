import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { computed, ref } from 'vue'

import { MAX_PROJECT_FRAMES } from '../../../src/modules/pixel-editor/core/index.ts'
import {
  frameCountAfterReplacement,
  replaceFramesFromIndex,
} from '../../../src/modules/pixel-editor/core/frame-import.ts'
import { encodeGif } from '../../../src/modules/pixel-editor/core/gif-encoder.ts'
import { sampleGifFramesByDuration } from '../../../src/modules/pixel-editor/core/gif-frame-sampling.ts'

const editorSource = readFileSync(
  new URL('../../../src/modules/pixel-editor/components/editor/PixelEditor.vue', import.meta.url),
  'utf8'
)
const script = editorSource.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1]
assert.ok(script)
const parsedScript = ts.createSourceFile('PixelEditor.ts', script, ts.ScriptTarget.Latest, true)

// Execute the active component's real handlers and selection computeds. Only browser,
// network, rendering, and persistence collaborators are replaced by small test fakes.
function editorBindings(names: string[], dependencies: Record<string, unknown>) {
  const declarations = names.map((name) => {
    const declaration = parsedScript.statements.find((statement) => {
      if (ts.isFunctionDeclaration(statement)) return statement.name?.text === name
      return (
        ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.some(
          (variable) => ts.isIdentifier(variable.name) && variable.name.text === name
        )
      )
    })
    assert.ok(declaration, `Missing active editor binding: ${name}`)
    return declaration.getText(parsedScript)
  })
  const javascript = ts.transpileModule(declarations.join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  return new Function(
    ...Object.keys(dependencies),
    `${javascript}\nreturn { ${names.join(', ')} }`
  )(...Object.values(dependencies))
}

function frame(layerCount = 1) {
  return {
    id: 'frame',
    delay: 120,
    layers: Array.from({ length: layerCount }, (_, index) => ({
      id: `layer-${index}`,
      visible: true,
      pixels: ['#ffffff'],
      canvasPixels: {},
    })),
  }
}

function harness(previousWorkId: string | null = null, decodedFrameCount = 51) {
  const project = ref({
    id: 'local-draft',
    name: 'Local draft',
    version: 4,
    width: 32,
    height: 16,
    currentFrameIndex: 0,
    activeLayer: 0,
    frames: [frame()],
    createdAt: 1,
    updatedAt: 2,
  })
  const projects = ref([project.value])
  const editingWorkId = ref(previousWorkId)
  const editingWork = ref(previousWorkId ? { result: { id: previousWorkId } } : null)
  const loadingWork = ref(false)
  const status = ref('ready')
  const updates: string[] = []
  const creates: unknown[] = []
  const calls = { render: 0, sanitize: 0, snapshot: 0 }
  const captured = {
    project: null as unknown,
    gifBlobs: [] as Blob[],
    replacements: [] as unknown[][],
  }
  const dependencies = {
    computed,
    project,
    projects,
    editingWorkId,
    editingWork,
    loadingWork,
    status,
    MAX_PROJECT_FRAMES,
    frameCountAfterReplacement,
    replaceFramesFromIndex: (
      target: unknown[],
      startIndex: number,
      replacements: unknown[]
    ) => {
      captured.replacements.push(replacements)
      return replaceFramesFromIndex(target, startIndex, replacements)
    },
    sampleGifFramesByDuration,
    encodeGif,
    requiresGifResave: ref(false),
    blankWorkChecked: ref(false),
    lastSaveTimestamp: ref(0),
    saving: ref(false),
    autoSaveFirstDone: ref(false),
    view: ref('editor'),
    currentId: ref('local-draft'),
    WIDTH: 32,
    HEIGHT: 16,
    EMPTY: null,
    CURRENT_KEY: 'current-project',
    console: { log() {}, warn() {}, error() {} },
    t: (key: string, args?: { n?: number }) => `${key}:${args?.n ?? ''}`,
    getWorkDetailApi: async (id: string) => ({
      result: { id, type: 'GIF', gifFileUrl: 'https://example.test/remote.gif' },
    }),
    toCorsSafeImageUrl: (url: string) => url,
    fetch: async () => ({ ok: true, blob: async () => new Blob(['gif']) }),
    decodeGifFrames: async () =>
      Array.from({ length: decodedFrameCount }, () => ({
        image: {},
        delay: 120,
      })),
    makeFrame: () => frame(),
    renderImageToPixels: () => {
      calls.render += 1
      return ['#ffffff']
    },
    pixelsToCanvasPixels: () => ({}),
    sanitizeProject: (value: unknown) => {
      calls.sanitize += 1
      return value
    },
    id: () => 'loaded-project',
    syncFrameDelayInput() {},
    clearSelectionState() {},
    persistNow() {},
    renderAll() {},
    nextTick: (callback: () => void) => callback(),
    localStorage: { setItem() {} },
    ElMessage: {
      warning() {},
      error(message: string) {
        assert.fail(message)
      },
    },
    snapshot: () => {
      calls.snapshot += 1
    },
    touchProject() {},
    uploadPixelJSON: async (data: unknown) => {
      captured.project = data
      return { fileUrl: 'https://example.test/local.json' }
    },
    uploadDoodle: async () => ({ cover: 'cover', binFileUrl: 'bin', binSize: 1024 }),
    uploadGif: async (blob: Blob) => {
      captured.gifBlobs.push(blob)
      return { cover: 'cover', fileSize: 1024 }
    },
    compositeFrame: () => ['#ffffff'],
    updateWorkApi: async (id: string) => {
      updates.push(id)
    },
    createWorkApi: async (data: unknown) => {
      creates.push(data)
      return { result: 'new-local-work' }
    },
  }
  const bindings = editorBindings(
    [
      'currentFrameIndex',
      'activeLayer',
      'currentFrame',
      'currentLayer',
      'showFrameLimit',
      'loadWorkForEdit',
      'doSilentSave',
      'saveOSSOnly',
      'isValidWork',
      'hasChangesSinceLastSave',
      'markCurrentWorkSaved',
      'formatAutoSaveTime',
      'handleLoadGifImage',
      'handleDeleteFrame',
    ],
    dependencies
  )
  return { ...bindings, ...dependencies, updates, creates, calls, captured }
}

for (const previousWorkId of [null, 'prior-remote-work']) {
  test(`loading a 51-frame remote GIF samples it to 50 frames and marks it for resave (previous: ${previousWorkId ?? 'local draft'})`, async () => {
    const editor = harness(previousWorkId)

    await editor.loadWorkForEdit('sampled-remote-work')

    assert.equal(editor.loadingWork.value, false)
    assert.equal(editor.project.value.frames.length, 50)
    assert.equal(editor.editingWorkId.value, 'sampled-remote-work')
    assert.equal(editor.editingWork.value?.result.id, 'sampled-remote-work')
    assert.equal(editor.requiresGifResave.value, true)
    assert.equal(editor.calls.render, 50)
    assert.equal(editor.calls.sanitize, 1)
  })
}

test('loading a valid 50-frame remote GIF commits its project and editing identity together', async () => {
  const editor = harness('prior-remote-work', 50)

  await editor.loadWorkForEdit('accepted-remote-work')

  assert.equal(editor.project.value.id, 'loaded-project')
  assert.equal(editor.project.value.frames.length, 50)
  assert.equal(editor.editingWorkId.value, 'accepted-remote-work')
  assert.equal(editor.editingWork.value?.result.id, 'accepted-remote-work')
  assert.equal(editor.loadingWork.value, false)
})

test('importing a 100-frame GIF at frame 11 keeps the project at 50 frames', async () => {
  const editor = harness(null, 100)
  editor.project.value.frames = Array.from({ length: 50 }, () => frame())
  editor.currentFrameIndex.value = 10

  await editor.handleLoadGifImage({ target: { files: [{}], value: 'import.gif' } })

  assert.equal(editor.project.value.frames.length, 50)
  assert.equal(editor.captured.replacements[0].length, MAX_PROJECT_FRAMES - 10)
  assert.equal(editor.calls.snapshot, 1)
})

test('saving a 51-frame project normalizes frames without changing total duration', async () => {
  const editor = harness()
  const sourceFrames = Array.from({ length: 51 }, (_, index) => ({
    ...frame(),
    delay: index % 2 === 0 ? 25 : 15,
  }))
  editor.project.value.frames = sourceFrames

  assert.equal(await editor.saveOSSOnly(), true)

  const uploaded = editor.captured.project as { frames: { delay: number }[] }
  assert.ok(uploaded.frames.length <= MAX_PROJECT_FRAMES)
  assert.equal(
    uploaded.frames.reduce((sum, f) => sum + f.delay, 0),
    sourceFrames.reduce((sum, f) => sum + Math.max(20, Math.round(f.delay)), 0)
  )
  assert.equal(editor.requiresGifResave.value, false)
})

test('GIF replacement from layer 2 selects an existing imported layer', async () => {
  const editor = harness(null, 1)
  editor.project.value.frames = [frame(2)]
  editor.activeLayer.value = 1
  assert.equal(editor.currentLayer.value, editor.currentFrame.value.layers[1])

  await editor.handleLoadGifImage({ target: { files: [{}], value: 'import.gif' } })

  assert.equal(editor.currentFrame.value.layers.length, 1)
  assert.equal(editor.activeLayer.value, 0)
  assert.equal(editor.currentLayer.value, editor.currentFrame.value.layers[0])
  assert.equal(editor.calls.snapshot, 1)
})

for (const selectedFrameIndex of [0, 1]) {
  test(`deleting frame ${selectedFrameIndex + 1} from layer 2 selects an existing remaining layer`, () => {
    const editor = harness()
    editor.project.value.frames =
      selectedFrameIndex === 0 ? [frame(2), frame()] : [frame(), frame(2)]
    editor.currentFrameIndex.value = selectedFrameIndex
    editor.activeLayer.value = 1
    assert.equal(editor.currentLayer.value, editor.currentFrame.value.layers[1])

    editor.handleDeleteFrame()

    assert.equal(editor.project.value.frames.length, 1)
    assert.equal(editor.activeLayer.value, 0)
    assert.equal(editor.currentLayer.value, editor.currentFrame.value.layers[0])
    assert.equal(editor.calls.snapshot, 1)
  })
}
