# Pixel Editor Responsive Workspace Height Design

## Goal

Make the central Canvas, right Layers panel, and bottom Animation Frames panel fill the available editor viewport without document-level vertical scrolling at viewport heights of 700px or greater.

## Desktop Height Mode (700px and Above)

- `.pe-editor-scroll` occupies exactly `100vh - var(--pe-nav-height)` and clips document-level overflow.
- `.pe-editor-grid` fills that height, including its existing padding and gap.
- The first grid row is flexible and shared by the Canvas and Layers panels.
- Remove the fixed 526px minimum height from Canvas and Layers in this mode so the first row can shrink.
- The Frames row uses a responsive height between approximately 144px and 170px.
- The bottom edge of the Frames panel must align exactly with the bottom edge of the left Tools panel.
- Canvas zoom overflow remains owned by `.pe-canvas-viewport`.
- Layer overflow remains owned by `.pe-layers-panel`.
- Multiple frames continue to scroll horizontally inside `.pe-frames-list`.

## Short Height Mode (Below 700px)

- Restore document-level vertical scrolling.
- Restore the two-row content flow with a 526px first row and automatic Frames row.
- Restore 526px minimum heights for Canvas and Layers.
- Do not require the Frames bottom edge to align with the Tools panel bottom.
- Keep the existing short-height Tools-panel scrolling behavior.

## Testing

- Contract-test the fixed editor viewport, flexible desktop grid rows, zero panel minimum heights, and 699px fallback rules.
- Preserve Canvas, Layers, and Frames local overflow owners.
- At 1440×754, require document scroll height to equal client height and require Frames-bottom to equal Tools-bottom.
- At 1440×680, require document scroll height to exceed client height and confirm the 526px first row is restored.
- Verify Canvas zoom at 300% remains internally scrollable without changing the outer layout height.

