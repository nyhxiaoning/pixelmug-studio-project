import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../src/pages/works/index.vue', import.meta.url), 'utf8')

function block(marker: string, nextMarker: string): string {
  const start = source.indexOf(marker)
  const end = source.indexOf(nextMarker, start)
  assert.ok(start >= 0 && end > start)
  return source.slice(start, end)
}

test('samples decoded Works GIF frames before rendering pixels', () => {
  const handler = block('const handleFileUpload = async', 'const handleStaticImageUpload')
  const decode = handler.indexOf('await decodeGifFrames(file)')
  const sample = handler.indexOf('sampleGifFramesByDuration(')
  const render = handler.indexOf('renderImageToPixels(')

  assert.match(source, /MAX_PROJECT_FRAMES/)
  assert.ok(decode >= 0 && decode < sample && sample < render)
  assert.match(handler, /frameCount:\s*sampledGifFrames\.length/)
})

test('keeps incoming GIF file-size validation unchanged', () => {
  const uploadFileSource = readFileSync(
    new URL('../../src/lib/images/uploadFile.ts', import.meta.url),
    'utf8'
  )
  assert.match(uploadFileSource, /case AllowedArtifactTypes\.GIF:\s*return file\.size > 5 \* 1024 \* 1024/)
})

test('blocks Works device preview for GIFs without a reliable compliant frame count', () => {
  const preview = block('const sendWorkToDevice = async', '</script>')
  assert.match(source, /frameCount:\s*api\.frameCount/)
  assert.match(
    preview,
    /work\.type === 'GIF'[\s\S]*!Number\.isInteger\(work\.frameCount\)[\s\S]*work\.frameCount as number\) > MAX_PROJECT_FRAMES[\s\S]*return/
  )
})
