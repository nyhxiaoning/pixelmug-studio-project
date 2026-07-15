/**
 * 用户状态管理模块
 * 管理用户信息、登录状态等
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserInfo {
  id: number
  username: string
  email: string
  avatar?: string
}

export const useUserStore = defineStore('user', () => {
  // 状态
  const userInfo = ref<UserInfo | null>(null)
  const token = ref<string>('')
  const isLoggedIn = ref<boolean>(false)

  // 动作
  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info
    isLoggedIn.value = true
  }

  const setToken = (newToken: string) => {
    token.value = newToken
  }

  const logout = () => {
    userInfo.value = null
    token.value = ''
    isLoggedIn.value = false
  }

  // 计算属性
  const userName = computed(() => userInfo.value?.username || '')

  return {
    userInfo,
    token,
    isLoggedIn,
    userName,
    setUserInfo,
    setToken,
    logout
  }
})