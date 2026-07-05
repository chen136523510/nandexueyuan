<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  if (!username.value || !password.value) {
    errorMsg.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    await auth.login(username.value, password.value)
    const redirect = route.query.redirect || '/home'
    router.push(redirect)
  } catch (err) {
    errorMsg.value = err.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="qz-page auth-page">
    <div class="auth-card qz-card">
      <h1 class="auth-title">男德学院</h1>
      <p class="auth-subtitle">登录</p>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label>用户名</label>
          <input v-model="username" type="text" class="qz-input" placeholder="请输入用户名" autocomplete="username" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" type="password" class="qz-input" placeholder="请输入密码" autocomplete="current-password" />
        </div>

        <p v-if="errorMsg" class="auth-error">{{ errorMsg }}</p>

        <button type="submit" :disabled="loading" class="qz-btn-primary auth-btn">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <p class="auth-footer">
        没有账号？
        <router-link to="/register">凭邀请码注册</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--qz-bg-page);
}
.auth-card {
  width: 380px;
  padding: var(--qz-space-xxl) var(--qz-space-xl);
  box-shadow: var(--qz-shadow-md);
}
.auth-title {
  text-align: center;
  font-size: var(--qz-font-size-xl);
  font-weight: 700;
  color: var(--qz-primary);
  margin: 0 0 0.25rem;
}
.auth-subtitle {
  text-align: center;
  font-size: var(--qz-font-size-sm);
  color: var(--qz-text-secondary);
  margin: 0 0 var(--qz-space-xl);
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--qz-space-lg);
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--qz-space-xs);
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
.qz-input::placeholder {
  color: var(--qz-text-placeholder);
}
.qz-input:focus {
  border-color: var(--qz-primary);
  box-shadow: 0 0 0 3px rgba(168, 197, 160, 0.15);
}
.auth-error {
  color: var(--qz-danger);
  font-size: var(--qz-font-size-sm);
  margin: 0;
}
.auth-btn {
  width: 100%;
  padding: 10px;
  font-size: var(--qz-font-size-md);
}
.qz-btn-primary {
  background: var(--qz-primary);
  color: #fff;
  border: none;
  border-radius: var(--qz-radius-sm);
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
.auth-footer {
  text-align: center;
  margin: var(--qz-space-lg) 0 0;
  font-size: var(--qz-font-size-sm);
  color: var(--qz-text-secondary);
}
</style>
