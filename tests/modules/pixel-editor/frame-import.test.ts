import assert from 'node:assert/strict'
import test from 'node:test'

import {
  frameCountAfterReplacement,
  replaceFramesFromIndex,
} from '../../../src/modules/pixel-editor/core/frame-import.ts'

test('replaces existing frames beginning at the selected frame', () => {
  const frames = ['A', 'B', 'C', 'D']

  const selectedIndex = replaceFramesFromIndex(frames, 1, ['X', 'Y'])

  assert.deepEqual(frames, ['A', 'X', 'Y', 'D'])
  assert.equal(selectedIndex, 1)
})

test('appends imported frames that extend beyond the existing timeline', () => {
  const frames = ['A', 'B', 'C']

  const selectedIndex = replaceFramesFromIndex(frames, 2, ['X', 'Y', 'Z'])

  assert.deepEqual(frames, ['A', 'B', 'X', 'Y', 'Z'])
  assert.equal(selectedIndex, 2)
})

test('projects the frame count after replacing from the selected frame', () => {
  assert.equal(frameCountAfterReplacement(40, 10, 20), 40)
  assert.equal(frameCountAfterReplacement(40, 35, 20), 55)
  assert.equal(frameCountAfterReplacement(40, 100, 20), 60)
})
