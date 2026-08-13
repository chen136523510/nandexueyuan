<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import UserAvatar from './UserAvatar.vue'
import ProfileDialog from './ProfileDialog.vue'
import ThemeToggle from './ThemeToggle.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const showProfile = ref(false)

// ===== 响应式导航（窄屏抽屉） =====
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isMobile = computed(() => windowWidth.value <= 768)
const menuOpen = ref(false)

function onResize() {
  windowWidth.value = window.innerWidth
  if (!isMobile.value) menuOpen.value = false
}

// 路由切换后自动收起抽屉
watch(() => route.fullPath, () => { menuOpen.value = false })

// ===== TopBar 滚动变形（滚过一点后收紧+加阴影） =====
const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 8
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll)
})

function handleLogout() {
  auth.logout()
  router.push('/')
}

const menuItems = [
  { to: '/home', label: '首页' },
  { to: '/chat', label: '男德通' },
  { to: '/wall', label: '师德墙' },
  { to: '/mailbox', label: '院长信箱' },
  { to: '/nde', label: '德塔' },
]

// 移动端抽屉菜单：德塔为桌面端体验（手游/页游差距大），移动端不展示德塔入口
const drawerItems = computed(() =>
  isMobile.value ? menuItems.filter((m) => m.to !== '/nde') : menuItems,
)

const adminItem = { to: '/admin', label: '男通讯录' }
</script>

<template>
  <nav class="topbar" :class="{ scrolled }" aria-label="主导航">
    <span class="topbar-brand" @click="router.push('/')">男德学院</span>

    <!-- 桌面菜单 -->
    <div v-if="!isMobile" class="topbar-menu">
      <router-link v-for="m in menuItems" :key="m.to" :to="m.to" class="menu-item">{{ m.label }}</router-link>
      <router-link v-if="auth.role === 'super_admin' || auth.role === 'admin'" to="/admin" class="menu-item">{{ adminItem.label }}</router-link>
    </div>

    <div class="topbar-right">
      <!-- 移动端菜单按钮 -->
      <button
        v-if="isMobile"
        class="menu-toggle"
        aria-label="打开菜单"
        data-testid="topbar-menu-toggle"
        @click="menuOpen = true"
      >☰</button>
      <ThemeToggle />
      <UserAvatar @profile="showProfile = true" @logout="handleLogout" />
    </div>

    <!-- 移动端抽屉菜单 -->
    <Transition name="drawer">
      <div v-if="isMobile && menuOpen" class="drawer-layer">
        <div class="drawer-overlay" @click="menuOpen = false"></div>
        <aside class="drawer" role="dialog" aria-modal="true" aria-label="菜单">
          <div class="drawer-head">
            <span class="drawer-title">男德学院</span>
            <button
              class="drawer-close"
              aria-label="关闭菜单"
              data-testid="topbar-menu-close"
              @click="menuOpen = false"
            >✕</button>
          </div>
          <div class="drawer-menu">
            <router-link
              v-for="m in drawerItems"
              :key="m.to"
              :to="m.to"
              class="drawer-item"
            >{{ m.label }}</router-link>
            <router-link
              v-if="auth.role === 'super_admin' || auth.role === 'admin'"
              to="/admin"
              class="drawer-item"
            >{{ adminItem.label }}</router-link>
          </div>
        </aside>
      </div>
    </Transition>

    <ProfileDialog :show="showProfile" @close="showProfile = false" />
  </nav>
</template>

<style scoped>
.topbar {
  height: 52px;
  background: var(--md-bg-card);
  border-bottom: 1px solid var(--md-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: var(--md-z-modal);
  transition: box-shadow 0.3s var(--md-ease-out), background-color 0.3s var(--md-ease-out);
}

/* 滚动变形：滚过一点后收紧 + 阴影，提示"已离开顶部" */
.topbar.scrolled {
  background: var(--md-bg-card-translucent);
  backdrop-filter: blur(6px);
  box-shadow: var(--md-shadow-topbar);
}

.topbar-brand {
  font-family: var(--md-font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--md-primary);
  cursor: pointer;
  letter-spacing: 0.03em;
}
.topbar-menu {
  display: flex;
  gap: 2px;
  align-items: center;
}
.menu-item {
  padding: 6px 12px;
  font-family: var(--md-font-body);
  font-size: 14px;
  color: var(--md-text-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s var(--md-ease-out);
  position: relative;
  white-space: nowrap;
}
.menu-item:hover {
  color: var(--md-primary);
}
/* active 态：下划线替代圆角背景，打破 AI nav 指纹 */
.menu-item.router-link-active {
  color: var(--md-primary);
  font-weight: 600;
}
.menu-item.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 12px;
  right: 12px;
  height: 2px;
  background: var(--md-primary);
  border-radius: 1px;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 移动端菜单按钮 */
.menu-toggle {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--md-text);
  background: none;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  cursor: pointer;
  transition: border-color 0.2s var(--md-ease-out), color 0.2s var(--md-ease-out);
}
.menu-toggle:hover {
  border-color: var(--md-primary);
  color: var(--md-primary);
}
.menu-toggle:focus-visible {
  outline: 2px solid var(--md-primary-hover);
  outline-offset: 2px;
}

/* ===== 抽屉菜单 ===== */
.drawer-layer {
  position: fixed;
  inset: 0;
  z-index: var(--md-z-toast);
}
.drawer-overlay {
  position: absolute;
  inset: 0;
  background: var(--md-overlay);
}
.drawer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 240px;
  max-width: 80vw;
  background: var(--md-bg-card);
  box-shadow: 4px 0 24px rgba(74, 74, 74, 0.12);
  display: flex;
  flex-direction: column;
}
.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--md-divider);
}
.drawer-title {
  font-family: var(--md-font-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--md-primary);
  letter-spacing: 0.03em;
}
.drawer-close {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: var(--md-text-secondary);
  background: none;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  cursor: pointer;
  transition: border-color 0.2s var(--md-ease-out), color 0.2s var(--md-ease-out);
}
.drawer-close:hover {
  border-color: var(--md-primary);
  color: var(--md-primary);
}
.drawer-menu {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.drawer-item {
  padding: 12px 14px;
  font-family: var(--md-font-body);
  font-size: 15px;
  color: var(--md-text);
  text-decoration: none;
  border-radius: var(--md-radius);
  transition: background-color 0.2s var(--md-ease-out), color 0.2s var(--md-ease-out);
}
.drawer-item:hover {
  background: var(--md-bg-soft);
}
.drawer-item.router-link-active {
  background: var(--md-primary-bg);
  color: var(--md-primary-hover);
  font-weight: 600;
}

/* 抽屉过渡动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s var(--md-ease-out);
}
.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 0.25s var(--md-ease-out);
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(-100%);
}
</style>
