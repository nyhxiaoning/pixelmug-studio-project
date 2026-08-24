# Pixel Editor Canvas Gesture Zoom Design

## Goal

Allow users to zoom the central drawing Canvas with either a normal mouse wheel or `Ctrl`/`Cmd` + wheel and trackpad pinch gestures, while keeping all surrounding editor layout and browser-page behavior unchanged.

## Interaction

- Gesture zoom is active only while the pointer is over the actual central Canvas.
- The Canvas uses a `grab` cursor to indicate gesture interaction.
- Wheel down zooms out and wheel up zooms in.
- Normal wheel, modifier-assisted wheel, and trackpad pinch all use the same Canvas zoom path.
- Each gesture changes the existing Canvas zoom by 10%, clamped to 50%–300%.
- The current pointer position is the zoom anchor: after scaling, the same logical Canvas point remains as close as possible beneath the pointer.
- At 50% and 300%, outward gestures are still consumed. They must not scroll the editor page or trigger browser-page zoom.

## Architecture

The live behavior remains owned by `PixelEditor.vue`.

- Bind a non-passive `wheel` handler to `editorCanvasRef`, not `window`, `document`, the app shell, the viewport padding, or the right-side overview.
- Reuse `handleSetCanvasZoom()` and the existing constants so buttons, slider, wheel, and pinch share one source of truth.
- Before changing zoom, measure the Canvas rectangle and viewport scroll state, then adjust viewport scrolling after Vue applies the new Canvas size.
- Keep `canvasPoint()` unchanged because it already maps through the rendered Canvas rectangle.
- Keep `overviewZoom` fully independent.

## Event Boundaries

The wheel handler always calls `preventDefault()` for cancelable wheel events received by the Canvas, including no-op attempts beyond the minimum or maximum. It does not use a passive listener. Events outside the Canvas retain their existing page and panel scrolling behavior.

Pointer drawing handlers remain unchanged. Gesture zoom does not synthesize drawing input and does not alter pointer capture.

## Styling

Replace the central Canvas crosshair cursor with `grab`. Do not introduce pan-drag behavior or new tools in this change.

## Testing

- Contract-test the Canvas-level non-passive wheel binding.
- Lock wheel direction, 10% step reuse, `preventDefault()`, and 50%–300% clamping.
- Lock pointer-anchor measurement and post-render viewport scroll adjustment.
- Ensure the handler does not read or write `overviewZoom`.
- Preserve the existing pointer handlers and `canvasPoint()` DOM-rectangle mapping.
- Browser-test direct wheel, modifier wheel, 50% and 300% boundary attempts, live percentage, surrounding layout invariants, and logical coordinates.

