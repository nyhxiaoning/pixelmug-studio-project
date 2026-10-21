import assert from 'node:assert/strict'
import test from 'node:test'

import { encodeGif } from '../../../src/modules/pixel-editor/core/gif-encoder.ts'
import { decodeGifRgbaFramesFromBuffer } from '../../../src/modules/pixel-editor/core/image-import.ts'

test('preserves transparency when palette entry zero is a visible color', async () => {
  const source = encodeGif({
    width: 2,
    height: 1,
    frames: [{ delay: 100, pixels: [null, '#0000ff'] }],
  })
  const bytes = new Uint8Array(await source.arrayBuffer())

  // The encoder reserves palette index 0 for transparency. Make its RGB value
  // red to reproduce the uploaded GIF that currently develops a red background.
  bytes.set([255, 0, 0], 13)

  const [frame] = decodeGifRgbaFramesFromBuffer(bytes.buffer)

  assert.deepEqual(Array.from(frame.rgba), [0, 0, 0, 0, 0, 0, 255, 255])
})
