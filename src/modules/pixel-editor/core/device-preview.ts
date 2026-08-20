export interface DevicePreviewFlow {
  hasChanges: () => boolean
  save: () => Promise<boolean>
  preview: () => Promise<void>
}

export async function runDevicePreview(flow: DevicePreviewFlow): Promise<boolean> {
  if (flow.hasChanges()) {
    const saved = await flow.save()
    if (!saved) return false
  }

  await flow.preview()
  return true
}
