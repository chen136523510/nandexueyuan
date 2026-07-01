import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, register as apiRegister, logout as apiLogout, getMe } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(null)

  const isLoggedIn = computed(() => !!token.value)
  const role = computed(() => user.value?.role || '')
  const displayName = computed(() => user.value?.nickname || user.value?.username || '')

  async function login(username, password) {
    const res = await apiLogin({ username, password })
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('token', res.data.token)
    return res
  }

  async function register(username, password, inviteCode) {
    const res = await apiRegister({ username, password, inviteCode })
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('token', res.data.token)
    return res
  }

  async function fetchMe() {
    if (!token.value) return null
    try {
      const res = await getMe()
      user.value = res.data
      return res.data
    } catch {
      // token 无效，清除
      logout()
      return null
    }
  }

  async function logout() {
    try {
      if (token.value) await apiLogout()
    } catch {
      // 忽略登出请求失败
    }
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  return { token, user, isLoggedIn, role, displayName, login, register, fetchMe, logout }
})
