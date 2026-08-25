# Pixel Editor Color Popover Design

## Goal

Preserve the visible “Color” copy in the compact drawing color row and replace the native color dialog trigger with a controlled in-page color popover that has an explicit close button.

## Approved Main Row

The drawing section keeps a single row in this order:

1. Visible localized “Color” label.
2. Flexible hexadecimal color input.
3. Fixed 24px current-color swatch button.

The row remains compact and does not add brush opacity.

## Popover

- Clicking the swatch button opens a popover anchored below the swatch.
- The popover header contains the localized “Color” title and a top-right close button.
- The body uses Element Plus `ElColorPickerPanel`, already available in the project, bound directly to `currentColor` with hexadecimal output and no alpha channel.
- The popover closes through the close button, a click outside the color control, or the `Escape` key.
- Closing keeps the latest selected color and returns focus to the swatch button when closed through keyboard or the close button.

## State and Events

- `colorPickerOpen` is the sole visibility state.
- `colorControlRef` owns the label, input, and swatch; `colorPopoverRef` identifies the teleported popover so document pointer events can distinguish inside and outside clicks.
- `colorSwatchButtonRef` receives focus after explicit close.
- Existing `currentColor` remains the single source of truth for the hexadecimal input, picker panel, swatch background, and drawing handlers.
- Document pointer listeners are added on mount and removed before unmount.
- The existing keyboard handler closes the popover first when `Escape` is pressed.

## Accessibility

- The swatch is a real button with `aria-haspopup="dialog"`, `aria-expanded`, and the localized color label.
- The popover uses `role="dialog"` with a localized accessible name.
- The close button has a localized close label.
- Focus returns to the swatch button after explicit close.

## Styling

- Main-row changes stay scoped to `.pe-color-row`.
- The label is nowrap, the hex input flexes, and the swatch remains 24px square.
- The popover is teleported to `body` and positioned from the swatch rectangle so the tools panel’s intentional `overflow: hidden` cannot clip Element Plus’s 300px picker panel.
- Fixed positioning is clamped to the viewport, uses the existing panel colors/border/shadow tokens, and does not participate in page layout or introduce page-level scrolling.

## Verification

- Add source contracts for the retained label, control order, `ElColorPickerPanel` binding, close button, dialog semantics, outside-click lifecycle cleanup, and Escape behavior.
- Run the focused and adjacent toolbar contracts, test-file lint, QA build, and `git diff --check`.
- Browser-check opening, close-button behavior, outside click, Escape, two-way color synchronization, focus return, and toolbar overflow at 1440×754.
