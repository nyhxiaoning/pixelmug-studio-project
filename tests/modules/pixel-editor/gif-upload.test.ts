import assert from 'node:assert/strict'
import { File } from 'node:buffer'
import test from 'node:test'

import { decompressFrames, parseGIF } from 'gifuct-js'

import { encodePixelatedGifFile } from '../../../src/modules/pixel-editor/core/gif-upload.ts'

Object.assign(globalThis, { File })

test('creates an uploadable pixel-grid GIF from rendered frames', async () => {
  const source = new File([new Uint8Array([1, 2, 3])], 'smooth-source.gif', {
    type: 'image/gif',
  })
  const firstFrame = Array<string | null>(32 * 16).fill('#ff0000')
  const secondFrame = Array<string | null>(32 * 16).fill('#0000ff')

  const result = encodePixelatedGifFile(
    source,
    [
      { delay: 80, pixels: firstFrame },
      { delay: 160, pixels: secondFrame },
    ],
    32,
    16
  )

  assert.notEqual(result, source)
  assert.equal(result.name, source.name)
  assert.equal(result.type, 'image/gif')

  const parsed = parseGIF(await result.arrayBuffer())
  const frames = decompressFrames(parsed, false)

  assert.equal(parsed.lsd.width, 32)
  assert.equal(parsed.lsd.height, 16)
  assert.deepEqual(
    frames.map((frame) => frame.delay),
    [80, 160]
  )
  assert.deepEqual(Array.from(frames[0].colorTable[frames[0].pixels[0]]), [255, 0, 0])
  assert.deepEqual(Array.from(frames[1].colorTable[frames[1].pixels[0]]), [0, 0, 255])
})

test('preserves total duration when per-frame delays require GIF tick rounding', async () => {
  const source = new File([new Uint8Array([1])], 'duration.gif', { type: 'image/gif' })
  const pixels = Array<string | null>(32 * 16).fill('#00ff00')
  const result = encodePixelatedGifFile(
    source,
    [
      { delay: 25, pixels },
      { delay: 25, pixels },
      { delay: 25, pixels },
      { delay: 25, pixels },
    ],
    32,
    16
  )

  const parsed = parseGIF(await result.arrayBuffer())
  const frames = decompressFrames(parsed, false)
  assert.equal(frames.reduce((sum, frame) => sum + frame.delay, 0), 100)
})
