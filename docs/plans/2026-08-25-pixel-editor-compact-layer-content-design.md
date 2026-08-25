# Pixel Editor Compact Layer Content Design

## Goal

Give layer titles more usable horizontal space in the right panel by making layer text, icons, and opacity controls more compact while preserving every existing interaction.

## Approved Design

- Use `12px` text for the Layers heading, Add button, layer names, opacity value, and percent suffix.
- Change each layer row to five columns: `24px minmax(0, 1fr) 58px 24px 24px` with a `4px` gap.
- Reduce visibility, duplicate, and delete buttons from `28 × 28px` to `24 × 24px`.
- Render the Lucide SVGs at `14 × 14px` through local layer-control styles.
- Keep the opacity group visible, reduce it from `80px` to `58px`, and keep its numeric input at `28px` high with smaller padding.
- Keep layer names on one line with `white-space: nowrap`, `overflow: hidden`, and `text-overflow: ellipsis`.
- Preserve the existing `title`, ARIA labels, pressed state, disabled state, handlers, and `10–100%` validation.

## Acceptance Criteria

1. Normal layer names have materially more visible width than the current layout.
2. All layer-row text remains on one line.
3. Very long names use an ellipsis while their full value remains available through `title` and ARIA attributes.
4. Layer action icons compute to `14 × 14px` inside `24 × 24px` buttons.
5. The opacity input remains usable, displays its value and `%`, and computes to `28px` high inside a `58px` group.
6. No layer behavior or overview behavior changes.

## Verification

- Add a UI contract for exact columns, gaps, text sizing, one-line overflow, icon sizing, opacity sizing, and preserved bindings.
- Run targeted layer and workspace contracts, ESLint, QA build, and `git diff --check`.
- Verify computed sizes and title width in the live editor with normal and long layer names.
