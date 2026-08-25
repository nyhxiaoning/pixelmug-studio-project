# Pixel Editor Frame Controls Alignment Design

## Goal

Improve the bottom animation-frame controls so the current frame interval label and its value appear on one line, and the four frame action icons are visually centered inside their existing buttons.

## Approved Design

- Keep the frame controls column, button sizes, icon sizes, border, shadow, colors, and interactions unchanged.
- Change `.pe-frame-delay` to a two-column layout: the localized interval label occupies the first column and `.pe-frame-delay-input` occupies the second.
- Vertically center both columns and allow the input group to shrink inside the existing `162px` control column without overflow.
- Change `.pe-frame-action` to a local flex centering context with zero line height.
- Make direct SVG children block-level, non-shrinking items so inherited text line-height cannot create a visual vertical offset.
- Do not change global button or icon styles and do not use pixel translation fixes.

## Acceptance Criteria

1. The interval label, numeric input, and `ms` suffix appear on one horizontal line.
2. The interval control does not overflow the frame-controls column.
3. Play, add, duplicate, and delete icons are visually centered in their existing `34 × 34px` buttons.
4. Existing button handlers, disabled state, titles, and ARIA labels remain unchanged.
5. Frame panel height and responsive document-scroll behavior remain unchanged.

## Verification

- Add a UI contract for the delay grid and local icon-centering rules.
- Preserve and assert the four action button handlers.
- Run targeted contracts, ESLint, QA build, and `git diff --check`.
- Verify the controls at desktop height and the `699px` fallback in the live editor.
