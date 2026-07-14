<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getAnnouncement, updateAnnouncement } from '../api/announcement'
import UserAvatar from '../components/UserAvatar.vue'
import ProfileDialog from '../components/ProfileDialog.vue'
import AppFooter from '../components/AppFooter.vue'
import WordCloud from '../components/WordCloud.vue'
import { Bell, GraduationCap } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()

const announcement = ref('')
const annUpdatedAt = ref('')
const showProfile = ref(false)
const editingAnn = ref(false)
const annDraft = ref('')
const annLoading = ref(false)
const annMsg = ref('')

const canEditAnn = () => auth.role === 'admin' || auth.role === 'super_admin'

onMounted(async () => {
  await auth.fetchMe()
  await fetchAnnouncement()
})

async function fetchAnnouncement() {
  try {
    const res = await getAnnouncement()
    announcement.value = res.data.content
    annUpdatedAt.value = res.data.updatedAt
  } catch {
    announcement.value = '加载失败'
  }
}

function startEditAnn() {
  annDraft.value = announcement.value
  editingAnn.value = true
  annMsg.value = ''
}

async function saveAnnouncement() {
  if (!annDraft.value.trim()) {
    annMsg.value = '公告内容不能为空'
    return
  }
  annLoading.value = true
  try {
    const res = await updateAnnouncement(annDraft.value)
    announcement.value = res.data.content
    annUpdatedAt.value = res.data.updatedAt
    editingAnn.value = false
  } catch (err) {
    annMsg.value = err.message || '更新失败'
  } finally {
    annLoading.value = false
  }
}

function handleLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="main-page">
    <!-- 顶部导航 -->
    <nav class="topbar">
      <span class="topbar-brand" @click="router.push('/')">男德学院</span>
      <div class="topbar-menu">
        <router-link to="/home" class="menu-item">首页</router-link>
        <router-link to="/chat" class="menu-item">男德通</router-link>
        <router-link v-if="auth.role === 'super_admin' || auth.role === 'admin'" to="/admin" class="menu-item">男通讯录</router-link>
        <router-link to="/nde" class="menu-item">德塔</router-link>
      </div>
      <div class="topbar-right">
        <UserAvatar @profile="showProfile = true" @logout="handleLogout" />
      </div>
    </nav>

    <!-- 内容区 -->
    <div class="main-container">
      <!-- 群聊高频词云(居中醒目) -->
      <WordCloud />

      <!-- 群公告(小模块) -->
      <section class="ann-card">
        <div class="ann-header">
          <span class="ann-title"><Bell :size="16" style="vertical-align:-2px" /> 公告</span>
          <button v-if="canEditAnn() && !editingAnn" class="ann-edit-btn" @click="startEditAnn">编辑</button>
        </div>

        <div v-if="!editingAnn" class="ann-body">
          <p class="ann-content">{{ announcement }}</p>
          <span v-if="annUpdatedAt" class="ann-time">更新于 {{ new Date(annUpdatedAt).toLocaleString('zh-CN') }}</span>
        </div>

        <div v-else class="ann-edit">
          <textarea v-model="annDraft" class="ann-textarea" rows="4" placeholder="输入公告内容"></textarea>
          <p v-if="annMsg" class="ann-msg">{{ annMsg }}</p>
          <div class="ann-actions">
            <button @click="editingAnn = false" class="btn-cancel">取消</button>
            <button @click="saveAnnouncement" :disabled="annLoading" class="btn-save">
              {{ annLoading ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <AppFooter />

    <!-- 个人中心弹窗 -->
    <ProfileDialog :show="showProfile" @close="showProfile = false" />
  </div>
</template>

<style scoped>
.main-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
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
.menu-item.disabled {
  color: var(--md-text-disabled);
  cursor: not-allowed;
}

/* 内容区 */
.main-container {
  flex: 1;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 16px;
}

/* 公告栏 */
.ann-card {
  background: var(--md-bg-card);
  border-radius: var(--md-radius-lg);
  border: 1px solid var(--md-border);
  box-shadow: var(--md-shadow-sm);
  overflow: hidden;
}

.ann-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--md-divider);
}

.ann-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--md-text);
}

.ann-edit-btn {
  background: none;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  padding: 4px 12px;
  font-size: 13px;
  color: var(--md-text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.ann-edit-btn:hover {
  border-color: var(--md-primary);
  color: var(--md-primary);
}

.ann-body {
  padding: 20px;
}

.ann-content {
  font-size: 14px;
  line-height: 1.75;
  color: var(--md-text);
  margin: 0 0 12px;
  white-space: pre-wrap;
}

.ann-time {
  font-size: 12px;
  color: var(--md-text-secondary);
}

.ann-edit {
  padding: 20px;
}

.ann-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius);
  font-size: 14px;
  color: var(--md-text);
  background: var(--md-bg-card);
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.ann-textarea:focus {
  border-color: var(--md-primary);
  box-shadow: 0 0 0 3px rgba(168, 197, 160, 0.15);
}

.ann-msg {
  font-size: 13px;
  color: var(--md-danger);
  margin: 8px 0;
}

.ann-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.btn-cancel {
  padding: 6px 16px;
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius);
  font-size: 14px;
  color: var(--md-text-secondary);
  cursor: pointer;
  transition: border-color 0.2s;
}

.btn-cancel:hover {
  border-color: var(--md-border);
}

.btn-save {
  padding: 6px 16px;
  background: var(--md-primary);
  border: none;
  border-radius: var(--md-radius);
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-save:hover:not(:disabled) {
  background: var(--md-primary-hover);
}

.btn-save:disabled {
  background: var(--md-text-disabled);
  cursor: not-allowed;
}
</style>
