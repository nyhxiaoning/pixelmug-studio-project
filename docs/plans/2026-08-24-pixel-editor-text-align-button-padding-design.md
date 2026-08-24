# Pixel Editor Text Alignment Button Padding Design

## Goal

Reduce only the vertical padding of the Left, Center, and Right buttons beneath Pixel Text so they better match the compact left toolbar.

## Design

- Scope the rule to `.pe-tool-section--text .pe-button-row--three .pe-secondary`.
- Set vertical padding to 4px and retain horizontal padding at 11px.
- Preserve the three equal grid columns, existing gap, 12px text, border radius, colors, focus state, and click handlers.
- Do not change any other toolbar button or global `.pe-secondary` button.

## Testing

- Contract-test the exact scoped selector and `padding: 4px 11px`.
- Preserve all three `handleStampText(0|1|2)` bindings.
- Browser-test that all three buttons remain equal width and their rendered height is reduced at the 1440×754 editor viewport.

