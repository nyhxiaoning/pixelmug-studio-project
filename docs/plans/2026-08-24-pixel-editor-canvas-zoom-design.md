# Pixel Editor Central Canvas Zoom Design

## Goal

Add an independent zoom control for the central drawing Canvas. Users can zoom from 50% to 300% while the header, tools panel, layers panel, and animation frames panel keep their existing dimensions.

## Interaction

- Place the controls in the central Canvas metadata row.
- Render a decrement button, range slider, increment button, and live percentage value.
- Default zoom: 100%.
- Minimum zoom: 50%.
- Maximum zoom: 300%.
- Slider and buttons use 10% steps.
- Buttons clamp at the limits and become disabled at their respective boundary.

## Architecture

Introduce a dedicated `canvasZoom` state. It must not reuse `overviewZoom`, because overview zoom changes the right-side overview Canvas and viewport navigation.

The editor Canvas keeps its backing dimensions of 960×480. Zoom changes only its CSS display width and the derived automatic height. At 100%, the display remains equivalent to the current `min(100%, 960px)` behavior. At values above 100%, the central viewport scrolls internally; it does not resize the surrounding grid regions.

The Canvas display style is derived from the zoom percentage:

- `width`: the selected percentage of the available central viewport.
- `max-width`: 960px multiplied by the zoom factor.
- `height`: automatic, preserving the 2:1 aspect ratio.

The viewport uses normal overflow scrolling. Auto margins center the Canvas while it fits; when it exceeds the viewport, margins collapse so every edge remains reachable by scrolling.

## Coordinate Integrity

Do not modify `canvasPoint`, Canvas backing dimensions, render functions, project dimensions, or pixel storage. `canvasPoint` already converts pointer coordinates through `getBoundingClientRect()`, so it remains correct at every CSS display scale.

## Layout Boundaries

- `.pe-canvas-panel` keeps its existing grid area and height constraints.
- `.pe-canvas-viewport` owns any overflow created by zoom.
- Tools, layers, frames, navigation, and overview sizing do not depend on `canvasZoom`.
- `overviewZoom` remains an independent control.

## Accessibility

- Decrement and increment buttons receive localized titles and accessible names.
- The range input receives a localized accessible name.
- The percentage is exposed as live text in the metadata row.
- Disabled states communicate the 50% and 300% boundaries.

## Verification

- Contract tests lock the independent state, 50–300 limits, 10% step, controls, Canvas styles, and unchanged pointer bindings.
- Browser checks cover 50%, 100%, and 300%.
- At every zoom, the surrounding grid dimensions remain stable.
- Drawing at the same logical position continues to affect the same logical pixel.
- At 300%, all Canvas edges remain accessible through the central viewport scrollbars.

