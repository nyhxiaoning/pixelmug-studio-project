import assert from 'node:assert/strict'
import test from 'node:test'

import { createPinia, setActivePinia } from 'pinia'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value))
  }
}

test('logout clears work and user-session data but keeps global preferences', async () => {
  const local = new MemoryStorage()
  const session = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: session })

  local.setItem('pixelart_web_editor_projects', '[{"id":"work-1"}]')
  local.setItem('pixelart_web_editor_current_project', 'work-1')
  local.setItem('locale', 'zh-CN')
  local.setItem('pixelart-web-editor.theme', 'dark')
  session.setItem('creator.preview.deviceIds', '["device-1"]')
  session.setItem('user-store', '{"token":"secret"}')

  const { useUserStore } = await import('../../src/pinia/modules/user.ts')
  setActivePinia(createPinia())
  useUserStore().logout()

  assert.equal(local.getItem('pixelart_web_editor_projects'), null)
  assert.equal(local.getItem('pixelart_web_editor_current_project'), null)
  assert.equal(session.getItem('creator.preview.deviceIds'), null)
  assert.equal(session.getItem('user-store'), null)
  assert.equal(local.getItem('locale'), 'zh-CN')
  assert.equal(local.getItem('pixelart-web-editor.theme'), 'dark')
})
