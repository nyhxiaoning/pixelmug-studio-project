# Pixel Editor Frame Thumbnail Fit Design

## Goal

Make the bottom animation-frame strip use the full width of `.pe-frame-content` while showing every static frame thumbnail completely and without distortion. When the frame strip exceeds the available width, scrolling remains local and horizontal.

## Approved Design

- Change `.pe-frame-content` from the current two-column grid to a single full-width column. The unused second column is removed.
- Keep every `.pe-frame-item` at a stable fixed width so adding frames does not resize existing thumbnails.
- Preserve the source canvas ratio of `96 × 48` (`2:1`). The rendered canvas fills the card width and derives its height from `aspect-ratio: 2 / 1`; it is not stretched or cropped.
- Keep `.pe-frames-list` as the horizontal overflow owner with `overflow-x: auto` and `overflow-y: hidden`.
- Preserve all existing frame behavior: selection, active styling, drag ordering, frame numbering, and click handling.

## Acceptance Criteria

1. A frame thumbnail displays the complete `96 × 48` image at a `2:1` ratio.
2. The thumbnail is neither cropped nor geometrically distorted.
3. The frame list occupies the full `.pe-frame-content` width.
4. Additional frames create a horizontal scrollbar inside `.pe-frames-list` without adding document-level horizontal or vertical scrolling.
5. Existing frame interactions remain unchanged.

## Verification

- Add a static UI contract for the single-column frame content, fixed frame width, `2:1` canvas ratio, and local horizontal overflow.
- Run the targeted contract test and QA build.
- Verify the live editor at a representative desktop viewport with enough frames to exercise horizontal overflow.
