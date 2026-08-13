import { ref, computed } from 'vue'

/**
 * 全站主题（晚自习模式）组合式函数
 *
 * 模式：auto（18:00~次日 7:00 自动深色）/ light / dark，持久化到 localStorage。
 * 单例状态：所有组件共享同一份 mode/isDark，App.vue 挂载时调用一次 applyTheme() 生效。
 * 仅负责 <html data-theme> 切换，颜色覆写在 styles/variables.css 的 :root[data-theme='dark']。
 */

const MODE_KEY = 'nde-theme'
const NIGHT_START = 18 // 晚自习开始
const NIGHT_END = 7 // 次日清晨结束

export const themeMode = ref(localStorage.getItem(MODE_KEY) || 'auto')

export const isDark = ref(false)

function isNightHour() {
  const h = new Date().getHours()
  return h >= NIGHT_START || h < NIGHT_END
}

export function applyTheme() {
  const dark = themeMode.value === 'auto' ? isNightHour() : themeMode.value === 'dark'
  isDark.value = dark
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

/** 循环切换：自动 → 深色 → 浅色 → 自动 */
export function cycleTheme() {
  const order = ['auto', 'dark', 'light']
  themeMode.value = order[(order.indexOf(themeMode.value) + 1) % order.length]
  localStorage.setItem(MODE_KEY, themeMode.value)
  applyTheme()
}

export const themeModeLabel = computed(() => ({
  auto: '自动（晚间深色）',
  dark: '晚自习模式',
  light: '浅色',
}[themeMode.value]))
