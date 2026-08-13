<script setup>
// 根组件：路由出口 + 全局弹窗 + 主题初始化 + 移动端底部导航
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import GlobalDialog from './components/GlobalDialog.vue'
import BottomNav from './components/BottomNav.vue'
import { applyTheme, themeMode } from './composables/useTheme'

// ===== 主题：挂载时按持久化模式生效；auto 模式下跨时辰时自动刷新 =====
let hourTimer = null

onMounted(() => {
  applyTheme()
  // 页面长期开着时，跨过 18:00/7:00 自动切换（auto 模式才需要）
  hourTimer = setInterval(() => {
    if (themeMode.value === 'auto') applyTheme()
  }, 60 * 1000)
})

onBeforeUnmount(() => hourTimer && clearInterval(hourTimer))

// ===== 移动端底部导航 =====
// 只在窄屏 + 这些主功能路由显示；德塔（视觉小说）为沉浸页不显示。
// 显示时给 body 挂 has-bottom-nav，让各页内容自动让出底部空间（见 base.css）。
const route = useRoute()
const NAV_ROUTES = ['/home', '/chat', '/wall', '/mailbox']

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isMobile = computed(() => windowWidth.value <= 768)

const navVisible = computed(() => isMobile.value && NAV_ROUTES.includes(route.path))

function onResize() {
  windowWidth.value = window.innerWidth
}

watch(navVisible, (v) => {
  document.body.classList.toggle('has-bottom-nav', v)
}, { immediate: true })

onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <router-view v-slot="{ Component }">
    <!-- 页面转场：淡入 + 轻微上浮缩放，模拟"推门而入" -->
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
  <GlobalDialog />
  <BottomNav v-if="navVisible" />
</template>

<style>
.page-enter-active {
  transition: opacity 0.28s var(--md-ease-out), transform 0.28s var(--md-ease-out);
}
.page-leave-active {
  transition: opacity 0.16s var(--md-ease-in);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.995);
}
.page-leave-to {
  opacity: 0;
}
</style>
