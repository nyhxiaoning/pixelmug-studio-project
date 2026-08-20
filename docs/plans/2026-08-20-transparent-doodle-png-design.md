# Transparent Doodle PNG Design

## Goal

Ensure missing doodle pixels remain empty throughout upload preparation and are not rendered with a fallback color in the generated PNG cover.

## Data flow

- `uploadDoodle` passes the original color array through without replacing empty values.
- JSON preserves empty pixels as `null`.
- `convertHexArrayToPng` normalizes input to `width * height`; missing entries become empty pixels.
- Empty or invalid entries leave the preallocated RGBA pixel unchanged (`0, 0, 0, 0`), producing a fully transparent PNG pixel.
- Valid `#RGB` and `#RRGGBB` entries are rendered as opaque pixels.
- RGB565 output keeps its existing empty-pixel representation (`0`) because the format has no alpha channel.

## Error handling

- Invalid dimensions reject PNG conversion.
- Canvas context and PNG blob creation failures reject with explicit errors.
- Invalid color entries are treated as empty placeholders so they never introduce an unintended color.

## Verification

- Verify a missing first pixel has alpha `0` in the generated PNG data.
- Verify valid short and full hex colors remain opaque and preserve their RGB values.
- Verify input shorter than the requested dimensions leaves remaining pixels transparent.
- Run project type checking/build checks available in the repository.
