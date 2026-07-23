<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { listUsers, updateUserStatus, resetUserPassword, updateUserRole } from '../api/admin'
import { createInviteCode, listInviteCodes } from '../api/inviteCode'
import TopBar from '../components/TopBar.vue'
import { BookUser, RefreshCw, Plus, Copy, Check, Ban, CheckCircle, KeyRound, ShieldCheck } from 'lucide-vue-next'

const auth = useAuthStore()

// 权限
const isSuperAdmin = computed(() => auth.role === 'super_admin')

// Tab
const activeTab = ref('members')

// === 成员管理 ===
const users = ref([])
const userLoading = ref(false)

async function loadUsers() {
  userLoading.value = true
  try {
    const res = await listUsers()
    users.value = res.data
  } catch (err) {
    showToast(err.message || '加载失败', 'error')
  } finally {
    userLoading.value = false
  }
}

function isSelf(u) {
  return u.id === auth.user?.id
}

function canManage(u) {
  if (isSelf(u)) return false
  if (auth.role === 'admin' && u.role !== 'member') return false
  return true
}

async function toggleStatus(u) {
  const next = u.status === 'active' ? 'disabled' : 'active'
  const word = next === 'disabled' ? '禁用' : '启用'
  if (!confirm(`确定${word}「${u.nickname || u.username}」吗？`)) return
  try {
    await updateUserStatus(u.id, next)
    u.status = next
    showToast(`已${word}`, 'success')
  } catch (err) {
    showToast(err.message || `${word}失败`, 'error')
  }
}

async function doResetPassword(u) {
  if (!confirm(`确定重置「${u.nickname || u.username}」的密码吗？将生成随机临时密码。`)) return
  try {
    const res = await resetUserPassword(u.id)
    const pwd = res.data.tempPassword
    // 直接展示临时密码，可复制
    u._tempPwd = pwd
    showToast(`密码已重置，临时密码见下方`, 'success')
  } catch (err) {
    showToast(err.message || '重置失败', 'error')
  }
}

async function toggleRole(u) {
  const next = u.role === 'admin' ? 'member' : 'admin'
  if (!confirm(`确定将「${u.nickname || u.username}」的角色变更为「${next === 'admin' ? '管理员' : '成员'}」吗？`)) return
  try {
    await updateUserRole(u.id, next)
    u.role = next
    showToast('角色已更新', 'success')
  } catch (err) {
    showToast(err.message || '变更失败', 'error')
  }
}

// === 邀请码管理 ===
const inviteCodes = ref([])
const codeLoading = ref(false)
const generating = ref(false)

async function loadInviteCodes() {
  codeLoading.value = true
  try {
    const res = await listInviteCodes()
    inviteCodes.value = res.data
  } catch (err) {
    showToast(err.message || '加载失败', 'error')
  } finally {
    codeLoading.value = false
  }
}

async function doCreateCode() {
  generating.value = true
  try {
    await createInviteCode()
    showToast('邀请码已生成', 'success')
    await loadInviteCodes()
  } catch (err) {
    showToast(err.message || '生成失败', 'error')
  } finally {
    generating.value = false
  }
}

// === 复制 ===
const copiedKey = ref('')

async function copyText(text, key) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => { copiedKey.value = '' }, 2000)
  } catch {
    showToast('复制失败，请手动复制', 'error')
  }
}

// === Toast ===
const toast = ref({ show: false, msg: '', type: 'info' })
let toastTimer = null
function showToast(msg, type = 'info') {
  toast.value = { show: true, msg, type }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.show = false }, 3000)
}

// === 格式化 ===
function roleLabel(role) {
  return { super_admin: '院长', admin: '管理员', member: '成员' }[role] || role
}
function statusLabel(status) {
  return status === 'active' ? '正常' : '禁用'
}
function codeStatusLabel(status) {
  return { unused: '未使用', used: '已使用', expired: '已过期' }[status] || status
}
function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// === 初始化 ===
onMounted(() => {
  loadUsers()
  loadInviteCodes()
})
</script>

<template>
  <div class="admin-page">
    <!-- 顶部导航 -->
    <TopBar />

    <!-- 内容区 -->
    <div class="admin-container">
      <!-- Tab -->
      <div class="tabs">
        <button :class="{ active: activeTab === 'members' }" @click="activeTab = 'members'">
          <BookUser :size="16" /> 成员管理
        </button>
        <button :class="{ active: activeTab === 'codes' }" @click="activeTab = 'codes'">
          <KeyRound :size="16" /> 邀请码
        </button>
      </div>

      <!-- 成员管理 -->
      <div v-if="activeTab === 'members'" class="tab-content">
        <p v-if="userLoading" class="loading-hint">加载中...</p>
        <div v-else class="user-list">
          <div v-for="u in users" :key="u.id" class="user-card" :class="{ disabled: u.status === 'disabled' }">
            <div class="user-info">
              <div class="user-name">
                <span>{{ u.nickname || u.username }}</span>
                <span class="user-tag" :class="`tag-${u.role}`">{{ roleLabel(u.role) }}</span>
                <span v-if="u.status === 'disabled'" class="user-tag tag-disabled">禁用</span>
                <span v-if="isSelf(u)" class="user-tag tag-self">我</span>
              </div>
              <div class="user-meta">@{{ u.username }} · 注册 {{ formatDate(u.createdAt) }}</div>
              <!-- 临时密码展示 -->
              <div v-if="u._tempPwd" class="temp-pwd-box">
                <span class="temp-pwd-label">临时密码：</span>
                <code class="temp-pwd-value">{{ u._tempPwd }}</code>
                <button class="copy-btn" @click="copyText(u._tempPwd, `pwd-${u.id}`)">
                  <component :is="copiedKey === `pwd-${u.id}` ? Check : Copy" :size="14" />
                  {{ copiedKey === `pwd-${u.id}` ? '已复制' : '复制' }}
                </button>
              </div>
            </div>
            <div class="user-actions">
              <button v-if="canManage(u)" class="action-btn" @click="toggleStatus(u)">
                <component :is="u.status === 'active' ? Ban : CheckCircle" :size="14" />
                {{ u.status === 'active' ? '禁用' : '启用' }}
              </button>
              <button v-if="canManage(u)" class="action-btn" @click="doResetPassword(u)">
                <RefreshCw :size="14" /> 重置密码
              </button>
              <button v-if="isSuperAdmin && !isSelf(u) && u.role !== 'super_admin'" class="action-btn" @click="toggleRole(u)">
                <ShieldCheck :size="14" /> {{ u.role === 'admin' ? '降为成员' : '升为管理员' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 邀请码管理 -->
      <div v-if="activeTab === 'codes'" class="tab-content">
        <div class="code-toolbar">
          <span class="code-hint">邀请码有效期 7 天，注册后自动标记为已使用</span>
          <button class="btn-primary" :disabled="generating" @click="doCreateCode">
            <Plus :size="16" /> {{ generating ? '生成中...' : '生成邀请码' }}
          </button>
        </div>
        <p v-if="codeLoading" class="loading-hint">加载中...</p>
        <div v-else-if="inviteCodes.length === 0" class="empty-hint">暂无邀请码</div>
        <div v-else class="code-list">
          <div v-for="c in inviteCodes" :key="c.id" class="code-card" :class="`code-${c.status}`">
            <div class="code-value">
              <code>{{ c.code }}</code>
              <button class="copy-btn" v-if="c.status === 'unused'" @click="copyText(c.code, `code-${c.id}`)">
                <component :is="copiedKey === `code-${c.id}` ? Check : Copy" :size="14" />
                {{ copiedKey === `code-${c.id}` ? '已复制' : '复制' }}
              </button>
            </div>
            <div class="code-meta">
              <span class="code-status" :class="`cs-${c.status}`">{{ codeStatusLabel(c.status) }}</span>
              <span>· 创建人 {{ c.creator?.nickname || c.creator?.username || '-' }}</span>
              <span>· 过期 {{ formatDate(c.expiresAt) }}</span>
              <span v-if="c.user"> · 使用人 {{ c.user.nickname || c.user.username }} </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" class="toast" :class="`toast-${toast.type}`">{{ toast.msg }}</div>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--md-bg, #f5f5f5);
}

/* 内容区 */
.admin-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px 16px;
}

/* Tab */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}
.tabs button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 14px;
  border: none;
  background: none;
  cursor: pointer;
  color: #888;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}
.tabs button.active {
  color: var(--md-primary, #6b8e6b);
  border-bottom-color: var(--md-primary, #6b8e6b);
  font-weight: 600;
}

/* 成员卡片 */
.user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.user-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 16px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #eee;
  transition: border-color 0.2s;
}
.user-card:hover {
  border-color: #d0d0d0;
}
.user-card.disabled {
  opacity: 0.55;
}
.user-name {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.user-meta {
  font-size: 12px;
  color: #aaa;
  margin-top: 2px;
}
.user-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}
.tag-super_admin { background: #e8f5e9; color: #2e7d32; }
.tag-admin { background: #e3f2fd; color: #1565c0; }
.tag-member { background: #f5f5f5; color: #888; }
.tag-disabled { background: #fbe9e7; color: #c62828; }
.tag-self { background: #fff3e0; color: #e65100; }

/* 临时密码 */
.temp-pwd-box {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff8e1;
  border-radius: 6px;
  border: 1px solid #ffe082;
}
.temp-pwd-label { font-size: 12px; color: #888; }
.temp-pwd-value { font-size: 14px; font-weight: 700; color: #e65100; }

/* 操作按钮 */
.user-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 12px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}
.action-btn:hover {
  border-color: var(--md-primary, #6b8e6b);
  color: var(--md-primary, #6b8e6b);
}

/* 复制按钮 */
.copy-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  font-size: 12px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  color: #888;
  transition: all 0.2s;
}
.copy-btn:hover {
  border-color: var(--md-primary, #6b8e6b);
  color: var(--md-primary, #6b8e6b);
}

/* 邀请码区 */
.code-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.code-hint {
  font-size: 12px;
  color: #aaa;
}
.btn-primary {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  font-size: 14px;
  background: var(--md-primary, #6b8e6b);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.code-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.code-card {
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #eee;
}
.code-used { opacity: 0.6; }
.code-expired { opacity: 0.5; }
.code-value {
  display: flex;
  align-items: center;
  gap: 8px;
}
.code-value code {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #333;
}
.code-meta {
  font-size: 12px;
  color: #aaa;
  margin-top: 4px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.code-status { font-weight: 600; }
.cs-unused { color: #2e7d32; }
.cs-used { color: #1565c0; }
.cs-expired { color: #c62828; }

/* 通用 */
.loading-hint, .empty-hint {
  text-align: center;
  padding: 32px;
  color: #aaa;
  font-size: 14px;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  color: #fff;
  z-index: 9999;
  animation: toast-in 0.3s ease;
}
.toast-success { background: #2e7d32; }
.toast-error { background: #c62828; }
.toast-info { background: #1565c0; }

@keyframes toast-in {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
</style>