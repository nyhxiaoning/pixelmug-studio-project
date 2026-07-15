import type { AxiosRequestConfig } from "axios"
import type { ApiResult } from "./types"
import axios from "axios"
import { ElMessage } from "element-plus"
import { useUserStore } from "@/pinia/modules/user"

const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL ?? "",
  timeout: 50000,
  withCredentials: true
})

instance.interceptors.request.use((config) => {
  const userStore = useUserStore()
  config.headers = config.headers || {}
  if (userStore.token) {
    config.headers.token = userStore.token
  }
  config.headers.platform = 2
  return config
})

instance.interceptors.response.use(
  (response) => {
    debugger
    const data = response.data
    if (response.config.responseType === "blob" || response.config.responseType === "arraybuffer") {
      return data
    }
    if (data?.code === 200) {
      return data
    }
    if (data?.code === 401 || data?.code === 11101) {
      showError("登录已过期")
      redirectToLogin()
      return Promise.reject(new Error("登录已过期"))
    }
    const message = extractErrorMessage(data)
    showError(message)
    return Promise.reject(new Error(message))
  },
  (error) => {
    const message = extractErrorMessage(error?.response?.data) || error?.message || "网络请求失败"
    showError(message)
    return Promise.reject(error)
  }
)

export function request<T>(config: AxiosRequestConfig): Promise<ApiResult<T>> {
  return instance(config)
}

function redirectToLogin() {
  debugger
  const userStore = useUserStore()
  userStore.logout()
  const current = `${location.pathname}${location.search}${location.hash}`
  const redirect = encodeURIComponent(current.replace(/^.*#/, "") || "/settings")
  location.href = `/#/login?redirect=${redirect}`
}

function extractErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return ""
  }
  const result = data as {
    message?: string
    errorInfo?: {
      errorDetails?: string
      message?: string
    }
  }
  return result.message || "接口请求失败"
}

let lastError = ""
let lastErrorTime = 0

function showError(message: string) {
  const now = Date.now()
  if (message === lastError && now - lastErrorTime < 1500) {
    return
  }
  lastError = message
  lastErrorTime = now
  ElMessage.error(message)
}
