# Pixel Editor Reference UI Design

## Goal

Redesign the existing `/pixel-editor` workspace to match the visual hierarchy, layout, and interaction patterns of the Creator Center “Create” editor at `https://storage.qajeejio.com/luanzong/creatorhub/index.html`, while preserving the current editor’s drawing engine, project model, persistence, import/export, and device-preview behavior.

## Decision

Use the live Creator Center editor as the single source of truth for visual and interaction design. Rebuild the view shell around the current behavior instead of copying the reference implementation.

The reference editor renders its 32 × 16 board as 512 DOM buttons. The current editor uses a Canvas with established pointer-coordinate conversion, selection, shape drawing, onion skinning, imports, and rendering. Replacing Canvas with DOM pixels would be a functional rewrite and is explicitly out of scope.

## Constraints

- Preserve all existing behavior and public data formats.
- Preserve the Canvas element dimensions, refs, pointer handlers, and coordinate conversion.
- Preserve frame, layer, undo/redo, selection, text, gradient, image-import, export, save, and device-preview flows.
- Preserve save-before-device-preview behavior.
- Do not replace the active route with the currently unused `EditorShell.vue` component tree.
- Do not add dependencies.
- Treat desktop fidelity as the first release target. Narrow screens may use a minimum-width editor surface with horizontal overflow.

## Chosen Approach

Restructure the active template in `PixelEditor.vue` into a five-region editor shell and restyle it through `styles/index.scss`. Continue to bind every control to its existing state and event handler.

The five regions are:

1. Sticky top navigation.
2. Independently scrolling left tools panel.
3. Flexible center canvas panel.
4. Fixed-width right layers panel.
5. Bottom animation frames panel spanning the center and right columns.

## Reference Baseline

At a 1440 × 754 viewport, the live reference exposes the following useful layout baseline:

- Sticky top navigation: 57 px high.
- Workspace padding: 14 px.
- Workspace gap: 14 px.
- Left tools panel: 260 px wide.
- Right layers panel: 260 px wide.
- Center panel: flexible remaining width; 864 px in the observed viewport.
- Bottom frame panel: 133 px high in the observed single-frame state.
- Panels: white background, `#e1e6ec` border, 8 px radius.
- Neutral controls: pale gray background.
- Selected controls: pale green background with green border.
- Destructive controls: pale red treatment.
- Save action: near-black background with white text.
- Canvas: near-black background with dark gray grid.
- Font stack: PingFang SC and system sans-serif fonts.

These values are reference tokens, not fixed page dimensions. The center column must remain fluid.

## Information Architecture

```text
┌──────────────────────── sticky editor navigation ────────────────────────┐
├──────── tools ────────┬──────────── canvas ────────────┬──── layers ─────┤
│ independent scroll    │ flexible working area          │ fixed width     │
├───────────────────────┼──────── animation frames across center/right ────┤
└───────────────────────────────────────────────────────────────────────────┘
```

## Top Navigation

The top navigation contains:

- Works/back action mapped to `backHome`.
- Inline-editable project title mapped to `project.name`.
- Frame count from `project.frames.length`.
- Layer count from `currentFrame.layers.length`.
- Import menu.
- Export menu.
- Preview action.
- Save action.

The Import menu contains Static and Animated options. Static opens the existing PNG/JPEG/WebP input; Animated opens the existing GIF input.

The Export menu contains PNG and GIF options mapped to the existing export handlers.

Preview remains mapped to the existing device-preview flow, including validation, dirty-state save, save failure short-circuiting, and use of the newest uploaded work record.

Save uses the existing create/update behavior and exposes a loading-disabled state.

## Left Tools Panel

Reorder controls to match the live reference:

1. Tools.
2. Color.
3. Shapes.
4. Selection.
5. Onion skin.
6. Gradient tool.
7. Pixel text.

Tool buttons use consistent line icons and accessible tooltips. The active tool uses the reference green selected state. Existing keyboard shortcuts and `activeTool` behavior remain unchanged.

The color row contains a hex input, color swatch, opacity input, and percent suffix. Any existing palette remains available through the color control without consuming a permanent large block of panel space.

Selection and transformation actions use a compact icon grid. High-frequency selection, move, magic, copy, cut, and erase actions remain immediately visible. Rotate, flip, undo, redo, and clear-layer actions remain present and retain their existing handlers.

The panel scrolls independently so onion skin, gradient, and text controls remain reachable at shorter viewport heights.

## Canvas Panel

The canvas panel contains a metadata row and a viewport.

The metadata row presents the logical project dimensions and zoom percentage. The viewport centers the Canvas when it fits and scrolls internally when zoomed beyond its available bounds.

The visual surface matches the live editor’s near-black board and dark grid. The implementation must retain:

- Existing Canvas width and height attributes.
- `editorCanvasRef`.
- Pointer handlers.
- `canvasPoint()` coordinate conversion.
- `renderAll()` rendering.
- Onion-skin, selection, and shape overlays.

No decorative element may sit above the Canvas and intercept pointer events.

## Layers Panel

The right panel has a Layers heading and an add button. Each row contains:

- Visibility toggle.
- Layer name.
- Opacity input and percent suffix.
- Duplicate action.
- Delete action.

The active layer receives a clear selected state. Long layer lists scroll within the panel. Existing last-layer protection, active-layer selection, visibility, opacity, duplication, and deletion behavior remain unchanged.

## Animation Frames Panel

The frame panel contains a compact control group and a horizontally scrolling thumbnail strip.

Controls contain:

- Play/pause.
- Add frame.
- Duplicate frame.
- Delete frame.
- Current frame interval input with `ms` suffix.

The active thumbnail uses the reference pale-green selected card. Existing drag ordering, thumbnail rendering, playback, delay editing, and last-frame protection remain unchanged. Playback should keep the active thumbnail visible as the current frame advances.

## Image Import

The current static-image and GIF inputs move from the left tools panel into the top Import menu. The existing import crop, drag, zoom, fit, dithering, and pixel-preview behavior remains intact.

The import dialog adopts the same white panel, border, spacing, button, and form-control visual language. Confirming an import is the only point that modifies the current project. Canceling or an import error leaves the current project unchanged.

The image conversion implementation in `core/image-import.ts` remains unchanged unless a separately reproduced defect requires modification.

## Export, Preview, and Save Feedback

- Export is a menu with PNG and GIF items.
- Preview exposes loading and disabled states and preserves save-before-preview.
- Save exposes loading and disabled states and keeps current toast/status behavior.
- Menus close on selection, Escape, and outside click.
- Icon-only buttons retain accessible names and hover tooltips.

## Responsive Behavior

- At 1280 px and above, render the complete three-column layout.
- Between 1024 px and 1279 px, preserve the two 260 px side panels where possible and compress the center viewport.
- Below 1024 px, preserve a minimum editor width and allow horizontal workspace scrolling.
- Do not introduce mobile drawers in the first release.
- Tools, layers, canvas viewport, and frames manage their own appropriate overflow.

## Component Boundary

The first implementation should modify the active `PixelEditor.vue` template and the active `styles/index.scss` stylesheet. It must not switch routing to the unused split editor component tree.

Small presentational components may be extracted only when they do not own project state and communicate through explicit props and emits. Business handlers and rendering state remain owned by `PixelEditor.vue` for this pass.

## Error Handling

- File-type and decode errors retain existing user feedback.
- Save failures leave the editor usable and prevent preview transmission.
- Preview validation occurs before saving.
- Import cancelation does not mutate the current frame or layer.
- Disabled controls prevent duplicate save, preview, and playback transitions.

## Verification

### Functional regression

- Brush, eraser, fill, picker, and gradient drawing.
- Shape drawing at correct start and end coordinates.
- Selection, move, magic, copy, cut, erase, rotate, and flip.
- Undo and redo.
- Onion skin rendering and opacity controls.
- Text stamping and alignment.
- Layer add, select, hide, opacity, duplicate, and delete.
- Frame add, select, reorder, duplicate, delete, interval, and playback.
- Static image and GIF import.
- PNG and GIF export.
- Create save and existing-work update.
- Dirty save before device preview.

### Visual regression

- Compare at 1440 px and 1920 px widths.
- Verify 57 px sticky header, 14 px spacing rhythm, 260 px side panels, reference colors, and panel radii.
- Verify the tools panel remains usable at short viewport heights.
- Verify no clipping or overlap in Chinese and English locales.

### Technical validation

- Run targeted pixel-editor tests.
- Run TypeScript/Vue type checking.
- Run the QA production build.
- Manually verify Canvas coordinate accuracy at every supported zoom level.

## Out of Scope

- Replacing Canvas with DOM pixels.
- Changing project, frame, layer, OSS, binary, or editable JSON formats.
- Rewriting drawing algorithms.
- Replacing the active route with the unused editor-shell implementation.
- Adding a new UI framework or icon dependency.
- Designing a mobile drawer-based editor.
