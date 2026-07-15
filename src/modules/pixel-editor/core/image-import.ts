/**
 * Image Import Module
 * 图片导入和GIF解码
 */

import { WIDTH, HEIGHT, EMPTY, hexToRgb, normalizeHex, palette, rgbToHex } from './index';

function nearestPaletteColorFn(r: number, g: number, b: number): string {
  let best = palette[0];
  let bestDist = Infinity;
  palette.forEach((color) => {
    const [pr, pg, pb] = hexToRgb(color);
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = color;
    }
  });
  return best;
}

export interface ImageImportOptions {
  fit: 'contain' | 'cover' | 'stretch';
  zoom: number;
  dither: 'none' | 'ordered' | 'floyd';
  preserveColors: boolean;
  cropX: number;
  cropY: number;
  outputWidth?: number;
  outputHeight?: number;
  allowUpscale?: boolean;
}

function quantizeImageData(data: Uint8ClampedArray, mode: string, width: number = WIDTH, height: number = HEIGHT): (string | null)[] {
  const out: (string | null)[] = [];
  const buffer: [number, number, number, number][] = [];
  for (let i = 0; i < data.length; i += 4) {
    buffer.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
  }

  const bayer = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      let [r, g, b, a] = buffer[index];
      if (a < 10) {
        out[index] = EMPTY;
        continue;
      }

      if (mode === 'ordered') {
        const t = (bayer[y % 4][x % 4] - 7.5) * 8;
        r += t;
        g += t;
        b += t;
      }

      const next = nearestPaletteColorFn(r, g, b);
      out[index] = normalizeHex(next);

      if (mode === 'floyd') {
        const [nr, ng, nb] = hexToRgb(next);
        const er = r - nr;
        const eg = g - ng;
        const eb = b - nb;

        [
          [1, 0, 7 / 16],
          [-1, 1, 3 / 16],
          [0, 1, 5 / 16],
          [1, 1, 1 / 16],
        ].forEach(([dx, dy, f]) => {
          const tx = x + dx;
          const ty = y + dy;
          if (tx < 0 || tx >= width || ty < 0 || ty >= height) return;
          const target = buffer[ty * width + tx];
          target[0] += er * f;
          target[1] += eg * f;
          target[2] += eb * f;
        });
      }
    }
  }
  return out.map(normalizeHex);
}

function preserveImageDataColors(data: Uint8ClampedArray): (string | null)[] {
  const out: (string | null)[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 10) {
      out.push(EMPTY);
    } else {
      out.push(rgbToHex(data[i], data[i + 1], data[i + 2]));
    }
  }
  return out;
}

export async function imageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  await image.decode();
  URL.revokeObjectURL(url);
  return image;
}

export function renderImageToPixels(image: HTMLImageElement | HTMLCanvasElement, options: ImageImportOptions): (string | null)[] {
  const width = Math.max(1, Number(options.outputWidth || WIDTH));
  const height = Math.max(1, Number(options.outputHeight || HEIGHT));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;

  const iw = image.width || image.videoWidth || WIDTH;
  const ih = image.height || image.videoHeight || HEIGHT;
  let sw = iw;
  let sh = ih;
  let sx = 0;
  let sy = 0;
  let dx = 0;
  let dy = 0;
  let dw = width;
  let dh = height;
  let zoom = Number(options.zoom || 1);

  if (options.fit === 'stretch') {
    zoom = Math.max(1, zoom);
    sw = iw / zoom;
    sh = ih / zoom;
    sx = (iw - sw) * options.cropX;
    sy = (ih - sh) * options.cropY;
  } else {
    const fitScale =
      options.fit === 'cover'
        ? Math.max(width / iw, height / ih)
        : Math.min(width / iw, height / ih);
    const baseScale = options.allowUpscale === false ? Math.min(1, fitScale) : fitScale;
    const scale = baseScale * zoom;
    dw = Math.max(1, Math.round(iw * scale));
    dh = Math.max(1, Math.round(ih * scale));
    dx = Math.round((width - dw) * options.cropX);
    dy = Math.round((height - dh) * options.cropY);
  }

  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  const data = ctx.getImageData(0, 0, width, height).data;

  if (options.preserveColors) {
    return preserveImageDataColors(data);
  }
  return quantizeImageData(data, options.dither, width, height);
}

export function pixelsToCanvasPixels(pixels: (string | null)[], width: number, height: number): Record<string, string> {
  const canvasPixels: Record<string, string> = {};
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = pixels[y * width + x] as string | null;
      if (!isEmptyPixel(color)) canvasPixels[`${x},${y}`] = color as string;
    }
  }
  return canvasPixels;
}

function isEmptyPixel(value: string | null | undefined): boolean {
  return value === EMPTY || value === undefined || value === null;
}

// ==================== GIF Decoding ====================

interface GifFrame {
  image: HTMLCanvasElement;
  delay: number;
}

class GifReader {
  bytes: Uint8Array;
  pos: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.bytes = new Uint8Array(buffer);
  }

  byte(): number {
    if (this.pos >= this.bytes.length) throw new Error('GIF 数据不完整。');
    return this.bytes[this.pos++];
  }

  word(): number {
    const low = this.byte();
    const high = this.byte();
    return low | (high << 8);
  }

  text(length: number): string {
    let out = '';
    for (let i = 0; i < length; i += 1) out += String.fromCharCode(this.byte());
    return out;
  }

  skip(length: number): void {
    this.pos = Math.min(this.bytes.length, this.pos + length);
  }

  subBlocks(): Uint8Array {
    const out: number[] = [];
    while (true) {
      const size = this.byte();
      if (!size) return new Uint8Array(out);
      for (let i = 0; i < size; i += 1) out.push(this.byte());
    }
  }
}

function readGifPalette(reader: GifReader, size: number): [number, number, number][] {
  const paletteData: [number, number, number][] = [];
  for (let i = 0; i < size; i += 1) {
    paletteData.push([reader.byte(), reader.byte(), reader.byte()]);
  }
  return paletteData;
}

function decodeGifLzw(minCodeSize: number, data: Uint8Array, expectedSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let dict: number[][] = [];
  for (let i = 0; i < clearCode; i += 1) dict[i] = [i];
  let nextCode = endCode + 1;
  let bitPos = 0;
  let prev: number[] | null = null;
  const out: number[] = [];

  const readCode = (): number | null => {
    let code = 0;
    for (let bit = 0; bit < codeSize; bit += 1) {
      const byteIndex = bitPos >> 3;
      if (byteIndex >= data.length) return null;
      code |= ((data[byteIndex] >> (bitPos & 7)) & 1) << bit;
      bitPos += 1;
    }
    return code;
  };

  while (out.length < expectedSize) {
    const code = readCode();
    if (code === null) break;
    if (code === clearCode) {
      dict = [];
      for (let i = 0; i < clearCode; i += 1) dict[i] = [i];
      codeSize = minCodeSize + 1;
      nextCode = endCode + 1;
      prev = null;
      continue;
    }
    if (code === endCode) break;

    let entry: number[];
    if (dict[code]) {
      entry = dict[code].slice();
    } else if (code === nextCode && prev) {
      entry = prev.concat(prev[0]);
    } else {
      break;
    }

    out.push(...entry);
    if (prev) {
      dict[nextCode] = prev.concat(entry[0]);
      nextCode += 1;
      if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1;
    }
    prev = entry;
  }

  return out.slice(0, expectedSize);
}

function deinterlaceGifIndices(indices: number[], width: number, height: number): number[] {
  const out = new Array(indices.length);
  const passes = [
    { start: 0, step: 8 },
    { start: 4, step: 8 },
    { start: 2, step: 4 },
    { start: 1, step: 2 },
  ];
  let sourceRow = 0;
  passes.forEach(({ start, step }) => {
    for (let y = start; y < height; y += step) {
      for (let x = 0; x < width; x += 1) {
        out[y * width + x] = indices[sourceRow * width + x];
      }
      sourceRow += 1;
    }
  });
  return out;
}

function canvasFromGifRgba(width: number, height: number, rgba: Uint8ClampedArray): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  return canvas;
}

function decodeGifFramesFallback(buffer: ArrayBuffer): GifFrame[] {
  const reader = new GifReader(buffer);
  const signature = reader.text(6);
  if (signature !== 'GIF87a' && signature !== 'GIF89a') throw new Error('不是有效的 GIF 文件。');

  const width = reader.word();
  const height = reader.word();
  const packed = reader.byte();
  reader.byte();
  reader.byte();

  const hasGlobalPalette = (packed & 0x80) !== 0;
  const globalPaletteSize = 1 << ((packed & 0x07) + 1);
  const globalPalette = hasGlobalPalette ? readGifPalette(reader, globalPaletteSize) : [];
  const canvasPixels = new Uint8ClampedArray(width * height * 4);
  const frames: GifFrame[] = [];
  let gce = { disposal: 0, delay: 120, transparentIndex: null as number | null };

  while (reader.pos < reader.bytes.length) {
    const block = reader.byte();
    if (block === 0x3b) break;

    if (block === 0x21) {
      const label = reader.byte();
      if (label === 0xf9) {
        reader.byte();
        const packedGce = reader.byte();
        const delayCs = reader.word();
        const transparentIndex = reader.byte();
        reader.byte();
        gce = {
          disposal: (packedGce >> 2) & 0x07,
          delay: Math.max(20, delayCs ? delayCs * 10 : 120),
          transparentIndex: (packedGce & 1) ? transparentIndex : null,
        };
      } else {
        reader.subBlocks();
      }
      continue;
    }

    if (block !== 0x2c) throw new Error('GIF 图像块格式不受支持。');

    const left = reader.word();
    const top = reader.word();
    const frameWidth = reader.word();
    const frameHeight = reader.word();
    const imagePacked = reader.byte();
    const hasLocalPalette = (imagePacked & 0x80) !== 0;
    const interlaced = (imagePacked & 0x40) !== 0;
    const localPaletteSize = 1 << ((imagePacked & 0x07) + 1);
    const paletteData = hasLocalPalette ? readGifPalette(reader, localPaletteSize) : globalPalette;
    const minCodeSize = reader.byte();
    const lzwData = reader.subBlocks();
    const previousPixels = gce.disposal === 3 ? canvasPixels.slice() : null;

    let indices = decodeGifLzw(minCodeSize, lzwData, frameWidth * frameHeight);
    if (interlaced) indices = deinterlaceGifIndices(indices, frameWidth, frameHeight);

    for (let y = 0; y < frameHeight; y += 1) {
      const dy = top + y;
      if (dy < 0 || dy >= height) continue;
      for (let x = 0; x < frameWidth; x += 1) {
        const dx = left + x;
        if (dx < 0 || dx >= width) continue;
        const colorIndex = indices[y * frameWidth + x];
        if (colorIndex === gce.transparentIndex) continue;
        const color = paletteData[colorIndex];
        if (!color) continue;
        const outIndex = (dy * width + dx) * 4;
        canvasPixels[outIndex] = color[0];
        canvasPixels[outIndex + 1] = color[1];
        canvasPixels[outIndex + 2] = color[2];
        canvasPixels[outIndex + 3] = 255;
      }
    }

    frames.push({ image: canvasFromGifRgba(width, height, canvasPixels), delay: gce.delay });

    if (gce.disposal === 2) {
      for (let y = 0; y < frameHeight; y += 1) {
        const dy = top + y;
        if (dy < 0 || dy >= height) continue;
        for (let x = 0; x < frameWidth; x += 1) {
          const dx = left + x;
          if (dx < 0 || dx >= width) continue;
          canvasPixels.fill(0, (dy * width + dx) * 4, (dy * width + dx) * 4 + 4);
        }
      }
    } else if (gce.disposal === 3 && previousPixels) {
      canvasPixels.set(previousPixels);
    }

    gce = { disposal: 0, delay: 120, transparentIndex: null };
  }

  if (!frames.length) throw new Error('没有解析到 GIF 帧。');
  return frames;
}

export async function decodeGifFrames(file: File): Promise<GifFrame[]> {
  const data = await file.arrayBuffer();

  if (!('ImageDecoder' in window)) {
    return decodeGifFramesFallback(data);
  }

  try {
    const decoder = new ImageDecoder({ data, type: 'image/gif' });
    await decoder.tracks.ready;
    const count = decoder.tracks.selectedTrack.frameCount || 1;
    const frames: GifFrame[] = [];

    for (let i = 0; i < count; i += 1) {
      const result = await decoder.decode({ frameIndex: i });
      const bitmap = result.image;
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.displayWidth;
      canvas.height = bitmap.displayHeight;
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
      frames.push({
        image: canvas,
        delay: Math.max(20, Math.round((result.image.duration || 120000) / 1000)),
      });
      bitmap.close();
    }
    return frames;
  } catch {
    return decodeGifFramesFallback(data);
  }
}
