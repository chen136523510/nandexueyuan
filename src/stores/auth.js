import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, register as apiRegister, logout as apiLogout, getMe } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(null)
  // 玩家形象 ID（1-5），同步自后端 user.skinId
  // 初始化时读取 localStorage（兜底），后续 fetchMe 覆盖
  const localSkinId = localStorage.getItem('skinId')
  const skinId = ref(localSkinId || null)
  // 是否已尝试从后端加载用户数据（用于路由守卫判断）
  const loaded = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const role = computed(() => user.value?.role || '')
  const displayName = computed(() => user.value?.nickname || user.value?.username || '学员')

  async function login(username, password) {
    const res = await apiLogin({ username, password })
    token.value = res.data.token
    user.value = res.data.user
    loaded.value = true
    localStorage.setItem('token', res.data.token)
    // 同步 skinId（可能为 null）
    skinId.value = res.data.user.skinId || null
    localStorage.setItem('skinId', skinId.value || '')
    return res
  }

  async function register(username, password, inviteCode) {
    const res = await apiRegister({ username, password, inviteCode })
    token.value = res.data.token
    user.value = res.data.user
    loaded.value = true
    localStorage.setItem('token', res.data.token)
    // 新注册用户 skinId 为 null，会跳转角色选择
    skinId.value = res.data.user.skinId || null
    localStorage.setItem('skinId', skinId.value || '')
    return res
  }

  async function fetchMe() {
    if (!token.value) return null
    try {
      const res = await getMe()
      user.value = res.data
      loaded.value = true
      // 同步 skinId（后端返回 null 表示未选择）
      skinId.value = res.data.skinId || null
      localStorage.setItem('skinId', skinId.value || '')
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
    skinId.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('skinId')
  }

  /** 设置玩家形象 ID（1-5），同步到 localStorage（供德塔使用） */
  function setSkinId(id) {
    skinId.value = String(id)
    localStorage.setItem('skinId', String(id))
  }

  return { token, user, skinId, loaded, isLoggedIn, role, displayName, login, register, fetchMe, logout, setSkinId }
})
