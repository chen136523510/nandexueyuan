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
  z-index: 100;
}
.topbar-brand {
  font-size: 17px;
  font-weight: 700;
  color: var(--md-primary);
  cursor: pointer;
}
.topbar-menu {
  display: flex;
  gap: 4px;
  align-items: center;
}
.menu-item {
  padding: 6px 14px;
  font-size: 14px;
  color: var(--md-text-secondary);
  text-decoration: none;
  border-radius: var(--md-radius);
  cursor: pointer;
  transition: all 0.2s;
}
.menu-item:hover,
.menu-item.router-link-active {
  color: var(--md-primary);
  background: rgba(168, 197, 160, 0.12);
}
.menu-item.router-link-active {
  font-weight: 600;
}
.topbar-right {
  display: flex;
  align-items: center;
}
</style>
