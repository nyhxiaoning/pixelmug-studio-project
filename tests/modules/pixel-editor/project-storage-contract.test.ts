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
