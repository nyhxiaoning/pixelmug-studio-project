import assert from 'node:assert/strict'
import test from 'node:test'

import { runDevicePreview } from '../../../src/modules/pixel-editor/core/device-preview.ts'

test('saves dirty work before previewing', async () => {
  const calls: string[] = []

  const result = await runDevicePreview({
    hasChanges: () => true,
    save: async () => {
      calls.push('save')
      return true
    },
    preview: async () => {
      calls.push('preview')
    },
  })

  assert.equal(result, true)
  assert.deepEqual(calls, ['save', 'preview'])
})

test('does not preview when saving fails', async () => {
  let previewed = false

  const result = await runDevicePreview({
    hasChanges: () => true,
    save: async () => false,
    preview: async () => {
      previewed = true
    },
  })

  assert.equal(result, false)
  assert.equal(previewed, false)
})

test('previews clean work without saving', async () => {
  const calls: string[] = []

  const result = await runDevicePreview({
    hasChanges: () => false,
    save: async () => {
      calls.push('save')
      return true
    },
    preview: async () => {
      calls.push('preview')
    },
  })

  assert.equal(result, true)
  assert.deepEqual(calls, ['preview'])
})
