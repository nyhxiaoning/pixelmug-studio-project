# Pixel Editor Compact Color Row Design

## Goal

Make the drawing color control match the compact reference layout while preserving all existing color-selection and drawing behavior.

## Approved UI

The drawing tools section uses one compact row containing:

1. A flexible hexadecimal color-value input.
2. A 24px square native color picker showing the currently selected color.

The visible “Color” label is removed to save horizontal space, while accessible labels remain on both inputs. Brush opacity is not added.

## Behavior

- Both controls continue to bind to `currentColor`.
- Editing the hexadecimal value updates the color swatch and drawing color.
- Clicking the swatch opens the browser’s native color picker.
- Drawing tools, button sizes, canvas behavior, and all other tool groups remain unchanged.

## Styling

- Scope all layout changes to `.pe-color-row`.
- Keep the row on one line.
- Let the hexadecimal input consume remaining width.
- Keep the color input fixed at 24px by 24px with compact padding and a visible border.
- Preserve the existing compact toolbar height behavior at supported viewport heights.

## Verification

- Add a focused UI contract covering the control order, shared `currentColor` binding, accessible names, one-line layout, flexible hex input, and 24px swatch.
- Run the focused contract, adjacent toolbar contracts, test-file lint, QA build, and `git diff --check`.
- Browser-check the color row at the compact editor viewport if the local page is available.
