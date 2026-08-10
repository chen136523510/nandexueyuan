<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import UserAvatar from './UserAvatar.vue'
import ProfileDialog from './ProfileDialog.vue'

const router = useRouter()
const auth = useAuthStore()
const showProfile = ref(false)

function handleLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <nav class="topbar">
    <span class="topbar-brand" @click="router.push('/')">男德学院</span>
    <div class="topbar-menu">
      <router-link to="/home" class="menu-item">首页</router-link>
      <router-link to="/chat" class="menu-item">男德通</router-link>
      <router-link to="/wall" class="menu-item">师德墙</router-link>
      <router-link to="/feedback" class="menu-item">反馈</router-link>
      <router-link v-if="auth.role === 'super_admin' || auth.role === 'admin'" to="/admin" class="menu-item">男通讯录</router-link>
      <router-link to="/nde" class="menu-item">德塔</router-link>
    </div>
    <div class="topbar-right">
      <UserAvatar @profile="showProfile = true" @logout="handleLogout" />
    </div>
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
}
</style>
