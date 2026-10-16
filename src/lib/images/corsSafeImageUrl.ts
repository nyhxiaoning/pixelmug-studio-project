const PUBLIC_STORAGE_HOST = 'storage.qajeejio.com'
const CORS_CACHE_VERSION = '1'
const SIGNED_QUERY_PARAMETERS = new Set([
  'ossaccesskeyid',
  'signature',
  'expires',
  'x-oss-signature',
  'x-oss-credential',
  'x-oss-expires',
])

export function toCorsSafeImageUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.hostname !== PUBLIC_STORAGE_HOST) return url
    if (
      [...parsedUrl.searchParams.keys()].some((key) =>
        SIGNED_QUERY_PARAMETERS.has(key.toLowerCase())
      )
    ) {
      return url
    }

    parsedUrl.searchParams.set('pixelCorsVersion', CORS_CACHE_VERSION)
    return parsedUrl.toString()
  } catch {
    return url
  }
}
