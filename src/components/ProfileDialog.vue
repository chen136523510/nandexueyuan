<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { updateProfile, updateSkin, updatePassword } from '../api/user'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const auth = useAuthStore()

const activeTab = ref('profile')

// 个人信息
const nickname = ref('')
const avatar = ref('')
const profileMsg = ref('')
const profileLoading = ref(false)

// 玩家形象
const selectedSkin = ref('1')
const skinMsg = ref('')
const skinLoading = ref(false)

// 修改密码
const oldPassword = ref('')
const newPassword = ref('')
const passwordMsg = ref('')
const passwordLoading = ref(false)

// 弹窗打开时同步数据
watch(() => props.show, (val) => {
  if (val) {
    activeTab.value = 'profile'
    nickname.value = auth.user?.nickname || ''
    avatar.value = auth.user?.avatar || ''
    selectedSkin.value = auth.skinId || '1'
    profileMsg.value = ''
    skinMsg.value = ''
    passwordMsg.value = ''
    oldPassword.value = ''
    newPassword.value = ''
  }
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

/** 选择并保存玩家形象 */
async function handleSkin(id) {
  const newId = String(id)
  if (newId === selectedSkin.value && auth.skinId === newId) return
  selectedSkin.value = newId
  skinLoading.value = true
  skinMsg.value = ''
  try {
    const res = await updateSkin({ skinId: newId })
    auth.user.skinId = res.data.skinId
    auth.setSkinId(res.data.skinId)
    skinMsg.value = '形象已更新（重进德塔生效）'
  } catch (err) {
    skinMsg.value = err.message || '更新失败'
  } finally {
    skinLoading.value = false
  }
}

/** 头像加载失败 → 隐藏图片露出色块 */
function onSkinAvatarError(e) {
  e.target.style.display = 'none'
}

async function handlePassword() {
  passwordLoading.value = true
  passwordMsg.value = ''
  try {
    await updatePassword({ oldPassword: oldPassword.value, newPassword: newPassword.value })
    // 修改成功后关闭弹窗，退出登录
    emit('close')
    await auth.logout()
  } catch (err) {
    passwordMsg.value = err.message || '修改失败'
  } finally {
    passwordLoading.value = false
  }
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay" @click="emit('close')">
      <div class="modal-card" @click.stop>
        <!-- 弹窗头部 -->
        <div class="modal-header">
          <h2 class="modal-title">个人中心</h2>
          <button class="modal-close" @click="emit('close')">×</button>
        </div>

        <!-- Tab 切换 -->
        <div class="tabs">
          <button
            class="tab"
            :class="{ active: activeTab === 'profile' }"
            @click="activeTab = 'profile'"
          >个人信息</button>
          <button
            class="tab"
            :class="{ active: activeTab === 'password' }"
            @click="activeTab = 'password'"
          >修改密码</button>
        </div>

        <!-- 个人信息 -->
        <div v-if="activeTab === 'profile'" class="tab-content">
          <div class="info-row">
            <span class="info-label">用户名</span>
            <span class="info-value">{{ auth.user?.username }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">角色</span>
            <span class="info-value">
              <span class="role-tag" :class="{
                'role-admin': auth.user?.role === 'super_admin',
                'role-sub': auth.user?.role === 'admin',
              }">{{ { super_admin: '院长', admin: '管理员', member: '成员' }[auth.user?.role] }}</span>
            </span>
          </div>

          <div class="form-group">
            <label>昵称</label>
            <input v-model="nickname" type="text" class="form-input" placeholder="显示昵称" maxlength="20" />
          </div>
          <div class="form-group">
            <label>头像 URL</label>
            <input v-model="avatar" type="text" class="form-input" placeholder="可选" />
          </div>

          <!-- 玩家形象 -->
          <div class="form-group">
            <label>玩家形象（重进德塔生效）</label>
            <div class="skin-grid">
              <div
                v-for="i in 5"
                :key="i"
                class="skin-item"
                :class="{ active: String(i) === selectedSkin }"
                @click="handleSkin(i)"
              >
                <div class="skin-avatar">
                  <img :src="`/game/sprites/avatars/player_set${i}.png`" :alt="`形象 ${i}`" @error="onSkinAvatarError" />
                </div>
                <span class="skin-label">{{ i }}</span>
              </div>
            </div>
            <p v-if="skinMsg" class="form-msg">{{ skinMsg }}</p>
          </div>

          <p v-if="profileMsg" class="form-msg">{{ profileMsg }}</p>
          <button @click="handleProfile" :disabled="profileLoading" class="btn-primary">
            {{ profileLoading ? '保存中...' : '保存' }}
          </button>
        </div>

        <!-- 修改密码 -->
        <div v-if="activeTab === 'password'" class="tab-content">
          <div class="form-group">
            <label>原密码</label>
            <input v-model="oldPassword" type="password" class="form-input" placeholder="请输入原密码" autocomplete="current-password" />
          </div>
          <div class="form-group">
            <label>新密码</label>
            <input v-model="newPassword" type="password" class="form-input" placeholder="6-32 个字符" autocomplete="new-password" />
          </div>

          <p v-if="passwordMsg" class="form-msg error">{{ passwordMsg }}</p>
          <button @click="handlePassword" :disabled="passwordLoading" class="btn-primary">
            {{ passwordLoading ? '修改中...' : '修改密码' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.modal-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
  width: 440px;
  max-width: 92vw;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #333;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--md-divider);
  padding: 0 24px;
}

.tab {
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 14px;
  color: var(--md-text-secondary);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.tab:hover {
  color: var(--md-primary);
}

.tab.active {
  color: var(--md-primary);
  border-bottom-color: var(--md-primary);
  font-weight: 500;
}

.tab-content {
  padding: 24px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 14px;
}

.info-label {
  color: var(--md-text-secondary);
  min-width: 3.5rem;
}

.info-value {
  color: var(--md-text);
}

.role-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.role-admin {
  background: #e8f2ff;
  color: var(--md-primary);
}

.role-sub {
  background: #e8f8ee;
  color: var(--md-success);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-group label {
  font-size: 13px;
  color: #666;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: #3c8cff;
  box-shadow: 0 0 0 2px rgba(60, 140, 255, 0.1);
}

.form-msg {
  font-size: 13px;
  color: #3c8cff;
  margin: 8px 0;
}

.form-msg.error {
  color: #ff4d4f;
}

.btn-primary {
  width: 100%;
  padding: 10px;
  background: #3c8cff;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #1677ff;
}

.btn-primary:disabled {
  background: #a0c7ff;
  cursor: not-allowed;
}

/* 形象选择网格 */
.skin-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 8px;
}

.skin-item {
  text-align: center;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  padding: 8px 4px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
}

.skin-item:hover {
  border-color: #c9a96e;
  background: #f5f5f0;
}

.skin-item.active {
  border-color: #3c8cff;
  background: #e8f2ff;
}

.skin-avatar {
  width: 40px;
  height: 40px;
  margin: 0 auto 4px;
  overflow: hidden;
  border-radius: 4px;
  background: #e8e8e8;
  position: relative;
}

.skin-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.skin-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.skin-item.active .skin-label {
  color: #3c8cff;
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s;
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.25s, opacity 0.25s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: scale(0.95);
  opacity: 0;
}
</style>
