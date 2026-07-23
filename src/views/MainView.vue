<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getAnnouncement } from '../api/announcement'
import UserAvatar from '../components/UserAvatar.vue'
import ProfileDialog from '../components/ProfileDialog.vue'
import VersionHistoryDialog from '../components/VersionHistoryDialog.vue'
import AppFooter from '../components/AppFooter.vue'
import WordCloud from '../components/WordCloud.vue'
import { Bell } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()

const announcement = ref('')
const annVersion = ref('')
const annDate = ref('')
const annUpdatedAt = ref('')
const showProfile = ref(false)
const showVersionHistory = ref(false)

onMounted(async () => {
  await auth.fetchMe()
  await fetchAnnouncement()
})

async function fetchAnnouncement() {
  try {
    const res = await getAnnouncement()
    announcement.value = res.data.summary || res.data.content || ''
    annVersion.value = res.data.version || ''
    annDate.value = res.data.date || ''
    annUpdatedAt.value = res.data.updatedAt || ''
  } catch {
    announcement.value = '加载失败'
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
        <router-link to="/wall" class="menu-item">师德墙</router-link>
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

      <!-- 版本公告 -->
      <section class="ann-card">
        <div class="ann-header">
          <span class="ann-title"><Bell :size="16" style="vertical-align:-2px" /> 公告</span>
          <button class="ann-history-btn" @click="showVersionHistory = true">版本历史</button>
        </div>

        <div class="ann-body">
          <div v-if="annVersion" class="ann-version-row">
            <span class="ann-badge">{{ annVersion }}</span>
            <span v-if="annDate" class="ann-date">{{ new Date(annDate).toLocaleDateString('zh-CN') }}</span>
          </div>
          <p class="ann-content">{{ announcement }}</p>
          <span v-if="annUpdatedAt" class="ann-time">更新于 {{ new Date(annUpdatedAt).toLocaleString('zh-CN') }}</span>
        </div>
      </section>
    </div>

    <AppFooter />

    <!-- 个人中心弹窗 -->
    <ProfileDialog :show="showProfile" @close="showProfile = false" />
    <!-- 版本历史弹窗 -->
    <VersionHistoryDialog :show="showVersionHistory" @close="showVersionHistory = false" @updated="fetchAnnouncement" />
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

.ann-history-btn {
  background: none;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  padding: 4px 12px;
  font-size: 13px;
  color: var(--md-text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.ann-history-btn:hover {
  border-color: var(--md-primary);
  color: var(--md-primary);
}

.ann-body {
  padding: 20px;
}

.ann-version-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.ann-badge {
  font-size: 13px;
  font-weight: 600;
  color: var(--md-primary);
  background: var(--md-primary-bg);
  padding: 2px 10px;
  border-radius: var(--md-radius-full);
}

.ann-date {
  font-size: 12px;
  color: var(--md-text-secondary);
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
</style>
