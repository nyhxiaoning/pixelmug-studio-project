function normalizedFrameIndex(startIndex: number, targetLength: number): number {
  return Math.max(0, Math.min(Math.trunc(startIndex), targetLength))
}

export function frameCountAfterReplacement(
  targetLength: number,
  startIndex: number,
  replacementLength: number
): number {
  const safeTargetLength = Math.max(0, Math.trunc(targetLength))
  const safeReplacementLength = Math.max(0, Math.trunc(replacementLength))
  const insertionIndex = normalizedFrameIndex(startIndex, safeTargetLength)
  return Math.max(safeTargetLength, insertionIndex + safeReplacementLength)
}

export function replaceFramesFromIndex<T>(
  target: T[],
  startIndex: number,
  replacements: T[]
): number {
  const insertionIndex = normalizedFrameIndex(startIndex, target.length)
  target.splice(insertionIndex, replacements.length, ...replacements)
  return insertionIndex
}
