import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const worksSource = readFileSync(
  new URL('../../../src/pages/works/index.vue', import.meta.url),
  'utf8'
)
const publishSource = readFileSync(
  new URL('../../../src/pages/publish/index.vue', import.meta.url),
  'utf8'
)
const editorSource = readFileSync(
  new URL('../../../src/modules/pixel-editor/components/editor/PixelEditor.vue', import.meta.url),
  'utf8'
)

test('work and publish cover previews populate only CORS-safe cache entries', () => {
  assert.match(
    worksSource,
    /<img[\s\S]*?crossorigin="anonymous"[\s\S]*?:src="toCorsSafeImageUrl\(work\.coverUrl\)"/
  )
  assert.match(
    worksSource,
    /<img[\s\S]*?crossorigin="anonymous"[\s\S]*?:src="toCorsSafeImageUrl\(row\.coverUrl\)"/
  )
  assert.equal(publishSource.match(/crossorigin="anonymous"/g)?.length, 3)
  assert.equal(publishSource.match(/:src="toCorsSafeImageUrl\(/g)?.length, 3)
})

test('static and GIF editor fallbacks bypass legacy non-CORS cache entries', () => {
  assert.match(editorSource, /image\.src = toCorsSafeImageUrl\(url\)/)
  assert.match(editorSource, /const gifSourceUrl = workDetail\.result\.gifFileUrl \|\| workDetail\.result\.coverUrl/)
  assert.match(editorSource, /const gifUrl = toCorsSafeImageUrl\(gifSourceUrl\)/)
})
