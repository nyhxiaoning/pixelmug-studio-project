import { defineStore } from "pinia"
const TOKEN_KEY = "bubble_admin_token"
const COMPANY_KEY = "bubble_admin_company"
const MENUS_KEY = "bubble_admin_menus"
const USER_ID_KEY = "bubble_admin_user_id"

export const useUserStore = defineStore("user", {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || "",
    userId: localStorage.getItem(USER_ID_KEY) || "",
    companyId: localStorage.getItem(COMPANY_KEY) || "",
    menuCodes: readMenuCodes()
  }),
  getters: {
    allowedMenus: (state) => state.menuCodes,
    canAccess: (state) => (module?: string) => !module || state.menuCodes.includes(module)
  },
  actions: {
    setLogin(login: {
      token: string
      id?: string
      name?: string
      phone?: string
      email?: string
      companyId?: string
      menuCodes?: string[]
    }) {
      this.token = login.token
      this.userId = login.id || ""
      this.companyId = login.companyId || ""
      this.menuCodes = login.menuCodes || []
      localStorage.setItem(TOKEN_KEY, this.token)
      localStorage.setItem(USER_ID_KEY, this.userId)
      localStorage.setItem(COMPANY_KEY, this.companyId)
      localStorage.setItem(MENUS_KEY, JSON.stringify(this.menuCodes))
    },
    setToken(token: string) {
      this.token = token
      localStorage.setItem(TOKEN_KEY, token)
    },
    logout() {
      this.token = ""
      this.userId = ""
      this.companyId = ""
      this.menuCodes = []
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_ID_KEY)
      localStorage.removeItem(COMPANY_KEY)
      localStorage.removeItem(MENUS_KEY)
    }
  }
})

function readMenuCodes() {
  const value = localStorage.getItem(MENUS_KEY)
  if (!value) return []
  try {
    const menus = JSON.parse(value)
    return Array.isArray(menus) ? menus : []
  } catch {
    return []
  }
}
