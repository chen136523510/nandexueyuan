<script setup>
// 移动端底部导航（app 式 tab 栏）：由 App.vue 在窄屏 + 指定路由时渲染
// 注意：德塔为桌面端体验（手游/页游差距大），移动端不提供德塔入口
const items = [
  { to: '/home', icon: '首', label: '首页' },
  { to: '/chat', icon: '通', label: '男德通' },
  { to: '/wall', icon: '墙', label: '师德墙' },
  { to: '/mailbox', icon: '箱', label: '信箱' },
]
</script>

<template>
  <Transition name="nav-rise">
    <nav class="bottom-nav" aria-label="移动端主导航">
      <router-link
        v-for="it in items"
        :key="it.to"
        :to="it.to"
        class="bottom-nav-item"
      >
        <span class="bn-icon">{{ it.icon }}</span>
        <span class="bn-label">{{ it.label }}</span>
      </router-link>
    </nav>
  </Transition>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--md-z-modal);
  display: flex;
  background: var(--md-bg-card-translucent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid var(--md-border);
  /* iOS 安全区：底部留出 home indicator 高度 */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px 6px;
  text-decoration: none;
  color: var(--md-text-secondary);
  position: relative;
  transition: color 0.2s var(--md-ease-out);
}

.bn-icon {
  font-family: var(--md-font-display);
  font-size: 17px;
  line-height: 1.2;
}

.bn-label {
  font-family: var(--md-font-body);
  font-size: 11px;
  line-height: 1.2;
}

.bottom-nav-item.router-link-active {
  color: var(--md-primary-hover);
  font-weight: 600;
}

/* 激活指示：顶部小横杠 */
.bottom-nav-item.router-link-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2.5px;
  border-radius: 0 0 2px 2px;
  background: var(--md-primary);
}

/* 上滑入场 */
.nav-rise-enter-active,
.nav-rise-leave-active {
  transition: transform 0.25s var(--md-ease-out);
}
.nav-rise-enter-from,
.nav-rise-leave-to {
  transform: translateY(100%);
}
</style>
