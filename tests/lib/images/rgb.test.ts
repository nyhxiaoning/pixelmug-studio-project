import assert from 'node:assert/strict'
import test from 'node:test'

import { createRgbaData } from '../../../src/lib/images/rgb.ts'

test('keeps missing and invalid pixels transparent', () => {
  const data = createRgbaData([null, '#f00', undefined, 'invalid'], 4, 1)

  assert.deepEqual(Array.from(data), [0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0])
})

test('rejects invalid image dimensions', () => {
  assert.throws(() => createRgbaData([], 0, 1), /width and height must be positive integers/)
})

test('pads a short color array with transparent pixels', () => {
  const data = createRgbaData(['#123456'], 2, 1)

  assert.deepEqual(Array.from(data), [18, 52, 86, 255, 0, 0, 0, 0])
})
