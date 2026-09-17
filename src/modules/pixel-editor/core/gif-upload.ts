import { encodeGif } from './gif-encoder'

export interface PixelatedGifFrame {
  delay: number
  pixels: (string | null)[]
}

export function encodePixelatedGifFile(
  sourceFile: File,
  frames: PixelatedGifFrame[],
  width: number,
  height: number
): File {
  const gifBlob = encodeGif({
    width,
    height,
    scale: 1,
    frames,
  })

  return new File([gifBlob], sourceFile.name, {
    type: 'image/gif',
    lastModified: sourceFile.lastModified,
  })
}
