import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeGifFrameDelay,
  sampleGifFramesByDuration,
} from '../../../src/modules/pixel-editor/core/gif-frame-sampling.ts'

test('rejects empty input and invalid frame limits', () => {
  assert.throws(() => sampleGifFramesByDuration([]), /empty GIF frame list/)
  assert.throws(() => sampleGifFramesByDuration([{ delay: 20 }], 0), /positive integer/)
  assert.throws(() => sampleGifFramesByDuration([{ delay: 20 }], 1.5), /positive integer/)
})

test('normalizes invalid and fractional delays without mutating source frames', () => {
  assert.equal(normalizeGifFrameDelay(Number.NaN), 20)
  assert.equal(normalizeGifFrameDelay(Number.POSITIVE_INFINITY), 20)
  assert.equal(normalizeGifFrameDelay(-1), 20)
  assert.equal(normalizeGifFrameDelay(19), 20)
  assert.equal(normalizeGifFrameDelay(20.6), 21)

  const frames = [
    { id: 'a', delay: 0, payload: { value: 1 } },
    { id: 'b', delay: 40.4, payload: { value: 2 } },
  ]
  const sampled = sampleGifFramesByDuration(frames, 50)

  assert.deepEqual(sampled.map((frame) => frame.delay), [20, 40])
  assert.deepEqual(frames.map((frame) => frame.delay), [0, 40.4])
  assert.notEqual(sampled, frames)
  assert.notEqual(sampled[0], frames[0])
  assert.equal(sampled[0].payload, frames[0].payload)
})

test('samples 100 uniform frames into 50 midpoint frames and preserves 4000ms', () => {
  const frames = Array.from({ length: 100 }, (_, index) => ({ index, delay: 40 }))
  const sampled = sampleGifFramesByDuration(frames, 50)

  assert.equal(sampled.length, 50)
  assert.deepEqual(sampled.map((frame) => frame.index), Array.from({ length: 50 }, (_, i) => i * 2 + 1))
  assert.ok(sampled.every((frame) => frame.delay === 80))
  assert.equal(sampled.reduce((sum, frame) => sum + frame.delay, 0), 4000)
})

test('weights long source frames by time and merges adjacent hits', () => {
  const frames = [
    { id: 'short-start', delay: 20 },
    { id: 'long', delay: 1000 },
    ...Array.from({ length: 50 }, (_, index) => ({ id: `tail-${index}`, delay: 20 })),
  ]
  const sampled = sampleGifFramesByDuration(frames, 50)

  assert.ok(sampled.length < 50)
  assert.equal(sampled.filter((frame) => frame.id === 'long').length, 1)
  assert.equal(sampled.reduce((sum, frame) => sum + frame.delay, 0), 2020)
})

test('uses integer boundaries and lets the last output absorb rounding drift', () => {
  const frames = Array.from({ length: 51 }, (_, index) => ({ index, delay: index === 50 ? 21 : 20 }))
  const sampled = sampleGifFramesByDuration(frames, 50)

  assert.ok(sampled.length <= 50)
  assert.ok(sampled.every((frame) => Number.isInteger(frame.delay) && frame.delay >= 20))
  assert.equal(sampled.reduce((sum, frame) => sum + frame.delay, 0), 1021)
})

test('supports an editor-specific remaining capacity', () => {
  const frames = Array.from({ length: 100 }, (_, index) => ({ index, delay: 40 }))
  const sampled = sampleGifFramesByDuration(frames, 40)

  assert.ok(sampled.length <= 40)
  assert.equal(sampled.reduce((sum, frame) => sum + frame.delay, 0), 4000)
})
