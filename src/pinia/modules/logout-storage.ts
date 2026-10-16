const LOCAL_WORK_KEYS = [
  'pixelart_web_editor_projects',
  'pixelart_web_editor_current_project',
] as const

const SESSION_WORK_KEYS = ['creator.preview.deviceIds', 'user-store'] as const

export function clearLogoutStorage(
  local: Pick<Storage, 'removeItem'>,
  session: Pick<Storage, 'removeItem'>
): void {
  LOCAL_WORK_KEYS.forEach((key) => local.removeItem(key))
  SESSION_WORK_KEYS.forEach((key) => session.removeItem(key))
}

