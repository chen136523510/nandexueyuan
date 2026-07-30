<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const emit = defineEmits(['profile', 'logout'])

const auth = useAuthStore()
const showDropdown = ref(false)
const dropdownRef = ref(null)

// 首字母：优先昵称，其次用户名
const initial = computed(() => {
  const name = auth.user?.nickname || auth.user?.username || '?'
  return name.charAt(0).toUpperCase()
})

// 随机底色（基于用户名稳定生成）
const bgColor = computed(() => {
  const colors = [
    '#3c8cff', '#00c853', '#ff9800', '#e91e63',
    '#9c27b0', '#00bcd4', '#ff5722', '#795548',
  ]
  const name = auth.user?.username || 'default'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function handleClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    showDropdown.value = false
  }
}

function handleProfile() {
  showDropdown.value = false
  emit('profile')
}

function handleLogout() {
  showDropdown.value = false
  emit('logout')
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="avatar-wrapper" ref="dropdownRef">
    <button class="avatar" @click="toggleDropdown" :style="{ background: bgColor }">
      {{ initial }}
    </button>

    <Transition name="dropdown">
      <div v-if="showDropdown" class="dropdown-menu">
        <div class="dropdown-header">
          <span class="dropdown-name">{{ auth.user?.nickname || auth.user?.username }}</span>
          <span class="dropdown-role">{{ { super_admin: '院长', admin: '管理员', member: '成员' }[auth.user?.role] }}</span>
        </div>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" @click="handleProfile">个人中心</button>
        <button class="dropdown-item danger" @click="handleLogout">退出登录</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s, transform 0.2s;
}

.avatar:hover {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.dropdown-menu {
  position: absolute;
  top: 44px;
  right: 0;
  width: 180px;
  background: var(--md-bg-card);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 200;
}

.dropdown-header {
  padding: 12px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--md-text);
}

.dropdown-role {
  font-size: 12px;
  color: var(--md-text-secondary);
}

.dropdown-divider {
  height: 1px;
  background: var(--md-divider);
  margin: 4px 0;
}

.dropdown-item {
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  text-align: left;
  font-size: 14px;
  color: var(--md-text);
  cursor: pointer;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.dropdown-item.danger {
  color: var(--md-danger);
}

.dropdown-item.danger:hover {
  background: #fff1f0;
}

/* 动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
