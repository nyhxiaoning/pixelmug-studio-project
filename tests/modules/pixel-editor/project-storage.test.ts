import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_PROJECT_FRAMES,
  MAX_PROJECT_LAYERS,
  MAX_STORED_PROJECTS,
  STORAGE_KEY,
  loadProjects,
  makeFrame,
  makeLayer,
  makeProject,
  retainRecentProjects,
  sanitizeProject,
  saveProjects,
} from '../../../src/modules/pixel-editor/core/index.ts'
import type { Project } from '../../../src/modules/pixel-editor/core/index.ts'

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

test('new frames and projects start with one layer', () => {
  assert.equal(makeFrame().layers.length, 1)
  assert.equal(makeProject('single layer').frames[0].layers.length, 1)
})

test('sanitizeProject fills an empty layer list but preserves valid multiple layers', () => {
  const empty = makeProject('empty layers')
  empty.frames[0].layers = []
  assert.equal(sanitizeProject(empty).frames[0].layers.length, 1)

  const existing = makeProject('existing layers')
  existing.frames[0].layers = [makeLayer(0), makeLayer(1)]
  assert.equal(sanitizeProject(existing).frames[0].layers.length, 2)
})
