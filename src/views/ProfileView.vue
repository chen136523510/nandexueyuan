<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { updateProfile, updatePassword } from '../api/user'

const router = useRouter()
const auth = useAuthStore()

const nickname = ref('')
const avatar = ref('')
const profileMsg = ref('')
const profileLoading = ref(false)

const oldPassword = ref('')
const newPassword = ref('')
const passwordMsg = ref('')
const passwordLoading = ref(false)

onMounted(async () => {
  await auth.fetchMe()
  nickname.value = auth.user?.nickname || ''
  avatar.value = auth.user?.avatar || ''
})

async function handleProfile() {
  profileLoading.value = true
  profileMsg.value = ''
  try {
    const res = await updateProfile({ nickname: nickname.value, avatar: avatar.value })
    auth.user.nickname = res.data.nickname
    auth.user.avatar = res.data.avatar
    profileMsg.value = '个人信息已更新'
  } catch (err) {
    profileMsg.value = err.message || '更新失败'
  } finally {
    profileLoading.value = false
  }
}

async function handlePassword() {
  passwordLoading.value = true
  passwordMsg.value = ''
  try {
    await updatePassword({ oldPassword: oldPassword.value, newPassword: newPassword.value })
    await auth.logout()
    router.push('/login')
  } catch (err) {
    passwordMsg.value = err.message || '修改失败'
  } finally {
    passwordLoading.value = false
  }
}

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="qz-page">
    <nav class="qz-navbar">
      <span class="qz-navbar-brand">男德学院</span>
      <div class="qz-navbar-nav">
        <router-link to="/" class="qz-navbar-link">首页</router-link>
      </div>
      <div class="qz-navbar-right">
        <button class="qz-btn-text" style="color: var(--qz-danger);" @click="handleLogout">退出登录</button>
      </div>
    </nav>

    <div class="qz-container">
      <div class="profile-grid">
        <!-- 个人信息 -->
        <section class="qz-card">
          <div class="qz-card-header">
            <span class="qz-card-title">个人信息</span>
          </div>

          <div class="info-row">
            <span class="info-label">用户名</span>
            <span class="info-value">{{ auth.user?.username }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">角色</span>
            <span class="info-value">
              <span class="qz-tag" :class="{
                'qz-tag-blue': auth.user?.role === 'super_admin',
                'qz-tag-green': auth.user?.role === 'admin',
              }">{{ { super_admin: '院长', admin: '管理员', member: '成员' }[auth.user?.role] }}</span>
            </span>
          </div>

          <div class="form-group">
            <label>昵称</label>
            <input v-model="nickname" type="text" class="qz-input" placeholder="显示昵称" maxlength="20" />
          </div>
          <div class="form-group">
            <label>头像 URL</label>
            <input v-model="avatar" type="text" class="qz-input" placeholder="可选" />
          </div>

          <p v-if="profileMsg" class="msg">{{ profileMsg }}</p>
          <button @click="handleProfile" :disabled="profileLoading" class="qz-btn-primary">
            {{ profileLoading ? '保存中...' : '保存' }}
          </button>
        </section>

        <!-- 修改密码 -->
        <section class="qz-card">
          <div class="qz-card-header">
            <span class="qz-card-title">修改密码</span>
          </div>

          <div class="form-group">
            <label>原密码</label>
            <input v-model="oldPassword" type="password" class="qz-input" placeholder="请输入原密码" autocomplete="current-password" />
          </div>
          <div class="form-group">
            <label>新密码</label>
            <input v-model="newPassword" type="password" class="qz-input" placeholder="6-32 个字符" autocomplete="new-password" />
          </div>

          <p v-if="passwordMsg" class="msg">{{ passwordMsg }}</p>
          <button @click="handlePassword" :disabled="passwordLoading" class="qz-btn-default">
            {{ passwordLoading ? '修改中...' : '修改密码' }}
          </button>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qz-navbar {
  height: 52px;
  background: var(--qz-bg-card);
  border-bottom: 1px solid var(--qz-border);
  display: flex;
  align-items: center;
  padding: 0 var(--qz-space-xl);
  position: sticky;
  top: 0;
  z-index: 100;
}
.qz-navbar-brand {
  font-size: var(--qz-font-size-lg);
  font-weight: 700;
  color: var(--qz-primary);
}
.qz-navbar-nav {
  display: flex;
  gap: var(--qz-space-lg);
  margin-left: var(--qz-space-xxl);
}
.qz-navbar-link {
  font-size: var(--qz-font-size-base);
  color: var(--qz-text-secondary);
  cursor: pointer;
  transition: color 0.2s;
}
.qz-navbar-link:hover {
  color: var(--qz-primary);
}
.qz-navbar-right {
  margin-left: auto;
}

.qz-container {
  max-width: 700px;
  margin: 0 auto;
  padding: var(--qz-space-xl);
}
.profile-grid {
  display: flex;
  flex-direction: column;
  gap: var(--qz-space-lg);
}
.qz-card {
  background: var(--qz-bg-card);
  border-radius: var(--qz-radius-md);
  box-shadow: var(--qz-shadow-sm);
  padding: var(--qz-space-lg);
}
.qz-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--qz-space-md);
  border-bottom: 1px solid var(--qz-border-light);
  margin-bottom: var(--qz-space-lg);
}
.qz-card-title {
  font-size: var(--qz-font-size-lg);
  font-weight: 600;
  color: var(--qz-text-primary);
}
.info-row {
  display: flex;
  align-items: center;
  gap: var(--qz-space-lg);
  margin-bottom: var(--qz-space-md);
  font-size: var(--qz-font-size-base);
}
.info-label {
  color: var(--qz-text-secondary);
  min-width: 3.5rem;
}
.info-value {
  color: var(--qz-text-primary);
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--qz-space-xs);
  margin-bottom: var(--qz-space-md);
}
.form-group label {
  font-size: var(--qz-font-size-sm);
  color: var(--qz-text-secondary);
}
.qz-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--qz-border);
  border-radius: var(--qz-radius-sm);
  font-size: var(--qz-font-size-base);
  color: var(--qz-text-regular);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.qz-input:focus {
  border-color: var(--qz-primary);
  box-shadow: 0 0 0 2px rgba(60, 140, 255, 0.1);
}
.msg {
  font-size: var(--qz-font-size-sm);
  color: var(--qz-primary);
  margin: var(--qz-space-sm) 0;
}
.qz-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--qz-radius-full);
  font-size: var(--qz-font-size-xs);
}
.qz-tag-blue { background: var(--qz-primary-light); color: var(--qz-primary); }
.qz-tag-green { background: #e8f8ee; color: var(--qz-success); }
.qz-btn-primary {
  background: var(--qz-primary);
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: var(--qz-radius-sm);
  font-size: var(--qz-font-size-base);
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}
.qz-btn-primary:hover:not(:disabled) {
  background: var(--qz-primary-dark);
  box-shadow: var(--qz-shadow-hover);
}
.qz-btn-primary:disabled {
  background: #a0c7ff;
  cursor: not-allowed;
}
.qz-btn-default {
  background: #fff;
  color: var(--qz-text-regular);
  border: 1px solid var(--qz-border);
  padding: 8px 20px;
  border-radius: var(--qz-radius-sm);
  font-size: var(--qz-font-size-base);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.qz-btn-default:hover:not(:disabled) {
  border-color: var(--qz-primary);
  color: var(--qz-primary);
}
.qz-btn-text {
  background: transparent;
  border: none;
  padding: 4px 8px;
  font-size: var(--qz-font-size-base);
  cursor: pointer;
}
</style>
