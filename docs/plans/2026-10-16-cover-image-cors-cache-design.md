# Cover Image CORS Cache Design

## Problem

The works page loads `coverUrl` through a normal `<img>` request. When the pixel editor later loads the same URL with `crossOrigin = 'anonymous'`, Chrome can reuse the earlier non-CORS cached response. That cached response has no `Access-Control-Allow-Origin` header, so the editor rejects the image before pixel extraction begins.

Existing users must recover automatically without clearing their browser cache.

This change is frontend-only. It does not require OSS, CDN, or backend configuration changes.

## Design

Introduce a shared helper that converts public image URLs from `storage.qajeejio.com` into a stable, versioned CORS-safe URL by adding `pixelCorsVersion=1`. The versioned URL has a different browser cache key from the already-cached original URL, but remains stable so later visits can reuse it.

All cover-image `<img>` elements that can precede editing will use the helper and declare `crossorigin="anonymous"`. The editor image loader will use the same helper, set `crossOrigin` before `src`, and keep its existing image-decoding contract.

The helper will preserve existing query parameters and hashes. It will only modify the known public storage host; other URLs remain unchanged to avoid breaking signed or third-party URLs.

## Data Flow

1. The API returns the original `coverUrl`.
2. UI display and editor loading pass it through the shared helper.
3. The browser requests the stable versioned URL in CORS mode.
4. Aliyun OSS returns `Access-Control-Allow-Origin: *`.
5. The editor safely reads pixels from canvas without depending on the old browser cache entry.

## Error Handling

Invalid or relative URLs are returned unchanged rather than preventing rendering. Existing image error handling remains responsible for surfacing an unreachable resource.

## Testing

- Unit-test URL transformation, including existing queries, hashes, unrelated hosts, and invalid inputs.
- Add source-level UI contract coverage ensuring work-list cover images use anonymous CORS mode and the shared URL helper.
- Run the relevant unit tests, type checking, and the production build.

## Deployment Note

Deploying the frontend changes the requested URL through the stable version parameter, so already-cached unversioned browser responses are bypassed automatically.
