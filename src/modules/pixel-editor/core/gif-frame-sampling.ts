const MIN_GIF_FRAME_DELAY_MS = 20

export function normalizeGifFrameDelay(delay: number): number {
  if (!Number.isFinite(delay) || delay < MIN_GIF_FRAME_DELAY_MS) {
    return MIN_GIF_FRAME_DELAY_MS
  }
  return Math.max(MIN_GIF_FRAME_DELAY_MS, Math.round(delay))
}

function cloneFrameWithDelay<T extends { delay: number }>(frame: T, delay: number): T {
  return { ...frame, delay } as T
}

export function sampleGifFramesByDuration<T extends { delay: number }>(
  frames: T[],
  maxFrames = 50
): T[] {
  if (frames.length === 0) {
    throw new Error('Cannot sample an empty GIF frame list.')
  }
  if (!Number.isInteger(maxFrames) || maxFrames <= 0) {
    throw new Error('maxFrames must be a positive integer.')
  }

  const normalizedFrames = frames.map((frame) =>
    cloneFrameWithDelay(frame, normalizeGifFrameDelay(frame.delay))
  )
  if (normalizedFrames.length <= maxFrames) return normalizedFrames

  const totalDuration = normalizedFrames.reduce((sum, frame) => sum + frame.delay, 0)
  if (!Number.isSafeInteger(totalDuration)) {
    throw new Error('Normalized GIF duration exceeds the safe integer range.')
  }

  const output: T[] = []
  let sourceIndex = 0
  let sourceEnd = normalizedFrames[0].delay
  let previousSourceIndex = -1

  for (let intervalIndex = 0; intervalIndex < maxFrames; intervalIndex += 1) {
    const intervalStart = Math.round((intervalIndex * totalDuration) / maxFrames)
    const intervalEnd =
      intervalIndex === maxFrames - 1
        ? totalDuration
        : Math.round(((intervalIndex + 1) * totalDuration) / maxFrames)
    const midpointTimesTwo = intervalStart + intervalEnd

    while (
      sourceIndex < normalizedFrames.length - 1 &&
      sourceEnd * 2 <= midpointTimesTwo
    ) {
      sourceIndex += 1
      sourceEnd += normalizedFrames[sourceIndex].delay
    }

    const intervalDelay = intervalEnd - intervalStart
    if (sourceIndex === previousSourceIndex) {
      const previous = output[output.length - 1]
      output[output.length - 1] = cloneFrameWithDelay(previous, previous.delay + intervalDelay)
    } else {
      output.push(cloneFrameWithDelay(normalizedFrames[sourceIndex], intervalDelay))
      previousSourceIndex = sourceIndex
    }
  }

  const sampledDuration = output.reduce((sum, frame) => sum + frame.delay, 0)
  const durationDrift = totalDuration - sampledDuration
  if (durationDrift !== 0) {
    const last = output[output.length - 1]
    output[output.length - 1] = cloneFrameWithDelay(last, last.delay + durationDrift)
  }

  return output
}
