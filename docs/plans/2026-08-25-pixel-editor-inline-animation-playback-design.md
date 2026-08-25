# Pixel Editor Inline Animation Playback Design

## Goal

Play the animation directly inside the existing central editor canvas instead of opening a separate preview window, then restore and select the first frame when playback ends or is stopped.

## Approved Design

- Remove the fixed local preview popover, its close button, its dedicated `previewCanvasRef`, and its popover-only styles.
- Keep the existing frame-panel play/stop button as the playback control.
- Draw each composite frame directly into `editorCanvasRef` without changing `currentFrameIndex` during playback. This keeps the frame strip and layer panel from jumping between frames.
- Playback rendering clears the editor canvas, paints the canvas background, and draws only the composite frame pixels. Onion skin, selection outlines, shape previews, and other editing overlays are omitted so playback resembles the exported GIF.
- Play exactly one cycle from frame one through the last frame.
- Keep every frame visible for its configured delay, including the final frame.
- Disable pointer editing on the editor canvas while playback is active, without changing its size, zoom, or surrounding layout.
- Natural completion and manual stop share one cleanup path: clear the timer, mark playback stopped, select frame index `0`, clamp the active layer for frame one, render the editor normally, and recenter the overview.

## Acceptance Criteria

1. Starting playback does not create a popup, modal, or second preview canvas.
2. Animation pixels appear inside the existing editor canvas at its current zoom.
3. The bottom selected-frame highlight and right layer panel do not cycle during playback.
4. The final frame remains visible for its own delay before playback ends.
5. Natural completion and manual stop both leave frame one selected and displayed.
6. Canvas drawing interactions are blocked only while playback is active.
7. Frame delay, frame actions, zoom, layers, overview, and save/export behavior remain unchanged.

## Verification

- Add source contracts for removal of the popover/ref, inline playback renderer, shared reset path, final-frame timeout, and frame-index stability during ticks.
- Run targeted animation, canvas gesture, frame interaction, and device-preview tests plus ESLint, typecheck where scoped, QA build, and `git diff --check`.
- Verify in the live editor with several visibly distinct frames: inline playback, final-frame dwell, natural reset, manual-stop reset, first-frame highlight, and restored pointer interaction.
