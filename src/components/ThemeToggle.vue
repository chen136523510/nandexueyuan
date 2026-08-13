<script setup>
// 主题开关：循环 自动 → 深色（晚自习）→ 浅色
import { computed } from 'vue'
import { Moon, Sun, SunMoon } from 'lucide-vue-next'
import { themeMode, isDark, cycleTheme, themeModeLabel } from '../composables/useTheme'

// 图标跟随当前生效效果：深色显示月亮，浅色显示太阳，自动模式用日月图标
const icon = computed(() => {
  if (themeMode.value === 'auto') return SunMoon
  return isDark.value ? Moon : Sun
})
</script>

<template>
  <button
    class="theme-toggle"
    :aria-label="`主题切换（当前：${themeModeLabel}）`"
    :title="themeModeLabel"
    @click="cycleTheme"
  >
    <component :is="icon" :size="16" />
  </button>
</template>

<style scoped>
.theme-toggle {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--md-text-secondary);
  background: none;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  cursor: pointer;
  transition: border-color 0.2s var(--md-ease-out), color 0.2s var(--md-ease-out), transform 0.2s var(--md-ease-out);
}
.theme-toggle:hover {
  border-color: var(--md-primary);
  color: var(--md-primary);
  transform: rotate(15deg);
}
.theme-toggle:focus-visible {
  outline: 2px solid var(--md-primary-hover);
  outline-offset: 2px;
}
</style>
