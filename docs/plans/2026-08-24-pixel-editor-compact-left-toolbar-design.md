# Pixel Editor Compact Left Toolbar Design

## Goal

Make the complete left toolbar fit without an internal scrollbar at a 1440×754 desktop viewport while preserving every existing tool and handler.

## Typography

- All visible text inside `.pe-tools-panel` uses 12px.
- Existing font-weight semantics remain intact: headings and already-emphasized controls keep their current weight; ordinary labels and controls are not force-bolded.
- Typography changes are scoped to the left toolbar and do not affect navigation, Canvas, layers, or frames.

## Icons and Selection Grid

- All icons inside the left toolbar are visually reduced from the current 18px size to approximately 15px.
- Icon buttons are compacted to approximately 32px high while retaining their existing handlers, titles, aria labels, active states, and danger states.
- The Selection section's 13 actions use five equal columns, producing three rows.
- Other toolbar groups keep their current semantic grouping.

## Pixel Text Input

- Keep the existing `textTool.text` binding and stamping behavior.
- Display the textarea as a fixed single visual line.
- Disable resize and vertical wrapping.
- Hide vertical overflow and expose horizontal scrolling for content wider than the field.

## Spacing and Overflow

- Reduce section padding, heading margin, control-row margin/gap, and tool-grid gap consistently.
- At a 1440×754 viewport and taller common desktop layouts, `.pe-tools-panel.scrollHeight` must not exceed its client height and no toolbar scrollbar should appear.
- Below 700px viewport height, restore internal vertical scrolling so all tools remain reachable rather than clipping content.
- Do not set unconditional `overflow: hidden` without the short-height fallback.

## Testing

- Contract-test the 12px toolbar typography, preserved heading weight, 15px toolbar icons, 32px icon buttons, five-column Selection grid, and single-line horizontal textarea behavior.
- Ensure all existing toolbar action bindings remain present.
- Browser-test at 1440×754: no left-toolbar scrollbar, all sections remain visible, the Selection section is five columns, and long pixel text scrolls horizontally.
- Browser-test a height below 700px: left-toolbar vertical scrolling returns and bottom controls remain accessible.

