import type { Component } from "vue"
import { Box, Cpu, Files, Key, List, MagicStick, Operation, Picture, Tickets, UserFilled } from "@element-plus/icons-vue"

export interface AdminMenuItem {
  title: string
  path: string
  module: string
  icon: Component
}

export interface AdminMenuGroup {
  title: string
  icon: Component
  children: AdminMenuItem[]
}

export type AdminMenuEntry = AdminMenuItem | AdminMenuGroup

export const ADMIN_MENUS: AdminMenuEntry[] = [
  { title: "设置", path: "/settings", module: "setting", icon: Box },
  { title: "像素编辑器", path: "/pixel-editor", module: "pixel-editor", icon: Key },
  { title: "作品", path: "/works", module: "works", icon: Key },
  { title: "发布", path: "/publish", module: "publish", icon: Key },
]

export function isMenuGroup(entry: AdminMenuEntry): entry is AdminMenuGroup {
  return "children" in entry
}

export function flattenMenus(entries: AdminMenuEntry[] = ADMIN_MENUS) {
  return entries.flatMap((entry) => (isMenuGroup(entry) ? entry.children : [entry]))
}

export function defaultMenuCodes() {
  return flattenMenus().map((menu) => menu.module)
}

export function firstAllowedPath(menuCodes: string[]) {
  const allowed = new Set(menuCodes)
  return flattenMenus().find((menu) => allowed.has(menu.module))?.path || "/no-permission"
}
