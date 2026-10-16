import assert from 'node:assert/strict'
import test from 'node:test'

import { MAX_GIF_EXPORT_FRAMES } from '../../../src/modules/pixel-editor/core/index.ts'

test('limits GIF editing and export to 50 frames', () => {
  assert.equal(MAX_GIF_EXPORT_FRAMES, 50)
})
