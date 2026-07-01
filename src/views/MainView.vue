<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getAnnouncement, updateAnnouncement } from '../api/announcement'
import UserAvatar from '../components/UserAvatar.vue'
import ProfileDialog from '../components/ProfileDialog.vue'
import AppFooter from '../components/AppFooter.vue'

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
      <div class="topbar-right">
        <UserAvatar @profile="showProfile = true" @logout="handleLogout" />
      </div>
    </nav>

    <!-- 内容区 -->
    <div class="main-container">
      <!-- 公告栏 -->
      <section class="ann-card">
        <div class="ann-header">
          <span class="ann-title">📢 公告</span>
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
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
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
  color: #3c8cff;
  cursor: pointer;
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
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.ann-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.ann-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.ann-edit-btn {
  background: none;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.ann-edit-btn:hover {
  border-color: #3c8cff;
  color: #3c8cff;
}

.ann-body {
  padding: 20px;
}

.ann-content {
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  margin: 0 0 12px;
  white-space: pre-wrap;
}

.ann-time {
  font-size: 12px;
  color: #999;
}

.ann-edit {
  padding: 20px;
}

.ann-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.ann-textarea:focus {
  border-color: #3c8cff;
  box-shadow: 0 0 0 2px rgba(60, 140, 255, 0.1);
}

.ann-msg {
  font-size: 13px;
  color: #ff4d4f;
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
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: border-color 0.2s;
}

.btn-cancel:hover {
  border-color: #d9d9d9;
}

.btn-save {
  padding: 6px 16px;
  background: #3c8cff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-save:hover:not(:disabled) {
  background: #1677ff;
}

.btn-save:disabled {
  background: #a0c7ff;
  cursor: not-allowed;
}
</style>
