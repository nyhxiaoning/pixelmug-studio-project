import assert from 'node:assert/strict'
import test from 'node:test'

import { toCorsSafeImageUrl } from '../../../src/lib/images/corsSafeImageUrl.ts'

test('versions public storage images to bypass legacy browser cache entries', () => {
  assert.equal(
    toCorsSafeImageUrl('https://storage.qajeejio.com/im/artifact/image/work-id/doodle.png'),
    'https://storage.qajeejio.com/im/artifact/image/work-id/doodle.png?pixelCorsVersion=1'
  )
})

test('does not modify signed storage URLs', () => {
  const signedUrl =
    'https://storage.qajeejio.com/im/private/doodle.png?OSSAccessKeyId=key&Expires=1&Signature=value'

  assert.equal(toCorsSafeImageUrl(signedUrl), signedUrl)
})

test('preserves existing queries and hashes while setting a stable version', () => {
  assert.equal(
    toCorsSafeImageUrl(
      'https://storage.qajeejio.com/im/artifact/image/work-id/doodle.png?size=small#preview'
    ),
    'https://storage.qajeejio.com/im/artifact/image/work-id/doodle.png?size=small&pixelCorsVersion=1#preview'
  )
})

test('leaves third-party and malformed URLs unchanged', () => {
  assert.equal(
    toCorsSafeImageUrl('https://example.com/doodle.png'),
    'https://example.com/doodle.png'
  )
  assert.equal(toCorsSafeImageUrl('not a URL'), 'not a URL')
})
