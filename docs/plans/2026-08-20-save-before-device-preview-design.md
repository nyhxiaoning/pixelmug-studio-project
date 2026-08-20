# Save Before Device Preview Design

## Goal

Ensure device preview always uses the latest canvas data by saving modified work before calling the preview API.

## Flow

1. Validate that at least one preview device is selected.
2. Check `hasChangesSinceLastSave()`.
3. If the canvas is dirty, await `handleSaveToOSS()`.
4. Stop immediately when saving fails or the work is invalid.
5. Read `editingWork.value.result` after saving so newly uploaded URLs are used.
6. Call `previewToDeviceApi` with the latest file URL and size.

## Save contract

- Change `handleSaveToOSS` from `Promise<void>` to `Promise<boolean>`.
- Return `true` only after OSS upload and create/update succeed.
- Return `false` when a save is already running, the work is invalid, the upload is rejected, or an exception occurs.
- Update `lastSaveTimestamp` after every successful manual or preview-triggered save.
- Keep existing save status and toast behavior.

## Dirty-state baseline

Loading an existing remote work establishes a clean baseline. Set `lastSaveTimestamp` after the project has been loaded successfully so preview does not resave unchanged content.

## Error handling

- A save failure prevents preview transmission, avoiding stale device content.
- Device validation occurs before saving to avoid unnecessary uploads when preview cannot proceed.
- Existing preview API success, partial failure, and total failure messages remain unchanged.

## Verification

- Dirty work saves before preview and uses the updated work record.
- Clean work previews without saving.
- Failed save prevents the preview callback.
- Successful save updates the dirty-state timestamp.
- QA production build remains successful.
