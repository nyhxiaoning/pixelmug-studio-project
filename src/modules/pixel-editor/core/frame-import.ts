export function replaceFramesFromIndex<T>(
  target: T[],
  startIndex: number,
  replacements: T[]
): number {
  const insertionIndex = Math.max(0, Math.min(Math.trunc(startIndex), target.length))
  target.splice(insertionIndex, replacements.length, ...replacements)
  return insertionIndex
}
