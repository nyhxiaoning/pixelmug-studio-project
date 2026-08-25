# Pixel Editor Tall Toolbar Distribution Design

## Goal

Use the extra vertical space on taller screens by distributing the existing left-toolbar groups across the available panel height, without resizing controls or changing functionality.

## Approved Design

- Keep all current buttons, icons, inputs, selects, textareas, section padding, and internal row gaps at their compact sizes.
- At viewport heights of `800px` and above, make `.pe-tools-panel` a vertical flex container and distribute its six direct groups with `justify-content: space-between`.
- At the same tall-screen breakpoint, give every group heading `4px` of top and bottom padding so expanded groups do not retain the compact heading treatment.
- The distributed groups are drawing, shapes, selection, onion skin, pixel text, and the export footer. Their DOM order remains unchanged.
- Between `700px` and `799px`, keep the existing compact block flow so the groups are not forced apart when vertical space is limited.
- Below `700px`, preserve the existing local vertical scrolling fallback.
- Keep the export footer as the final group at the bottom of the panel.

## Acceptance Criteria

1. At `900px` and `1080px`, the first group remains near the panel top, the export footer remains near the panel bottom, and the intermediate gaps are evenly distributed.
2. At `700px` and `754px`, the current compact dimensions and layout remain unchanged.
3. Below `700px`, the left toolbar remains vertically scrollable.
4. Computed button, icon, input, select, and textarea sizes do not change between compact and tall layouts; group headings gain exactly `4px` top and bottom padding only in tall mode.
5. No toolbar group, control, handler, or ordering marker is removed.

## Verification

- Add a source-level UI contract for the `min-height: 800px` flex distribution rule, the exact heading padding, and unchanged control-size rules.
- Run the targeted toolbar and responsive workspace contracts, ESLint, QA build, and `git diff --check`.
- Measure group positions and control sizes in the live editor at `700`, `754`, `900`, and `1080px` viewport heights.
