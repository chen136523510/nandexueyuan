<script setup>
import { ref, computed, onMounted } from 'vue'
import { listFeedback, createFeedback, deleteFeedback, updateFeedbackStatus } from '../api/feedback'
import { useAuthStore } from '../stores/auth'
import { useDialogStore } from '../stores/dialog'

const auth = useAuthStore()
const dialog = useDialogStore()

const feedbacks = ref([])
const loading = ref(false)
const showForm = ref(false)
const filterStatus = ref('')

const formData = ref({
  type: 'bug',
  title: '',
  action: '',
  content: '',
})

const isAdmin = computed(() => auth.role === 'admin' || auth.role === 'super_admin')

const typeLabels = { bug: '🐛 BUG反馈', optimization: '🔧 功能优化', new_feature: '✨ 功能新增', story: '📖 剧情设计', other: '📝 其他' }
const typeColors = { bug: 'var(--md-danger)', optimization: 'var(--md-accent)', new_feature: 'var(--md-primary)', story: '#8b6bb5', other: 'var(--md-secondary)' }
const statusLabels = { open: '待处理', in_progress: '处理中', resolved: '已解决' }
const statusColors = { open: 'var(--md-danger)', in_progress: 'var(--md-accent)', resolved: 'var(--md-secondary)' }

const filteredFeedbacks = computed(() => {
  if (!filterStatus.value) return feedbacks.value
  return feedbacks.value.filter((f) => f.status === filterStatus.value)
})

onMounted(() => {
  loadFeedback()
})

async function loadFeedback() {
  loading.value = true
  try {
    const res = await listFeedback()
    feedbacks.value = res.data || []
  } catch {
    feedbacks.value = []
  }
  loading.value = false
}

async function submit() {
  if (!formData.value.title.trim()) return
  try {
    const res = await createFeedback({
      type: formData.value.type,
      title: formData.value.title.trim(),
      action: formData.value.action.trim() || '无',
      content: formData.value.content.trim(),
    })
    feedbacks.value.unshift(res.data)
    formData.value = { type: 'bug', title: '', action: '', content: '' }
    showForm.value = false
  } catch (err) {
    // 提交失败
  }
}

async function remove(id) {
  if (!await dialog.confirm('确定撤回这封信件？', { danger: true })) return
  try {
    await deleteFeedback(id)
    feedbacks.value = feedbacks.value.filter((f) => f.id !== id)
  } catch {
    // 删除失败
  }
}

async function changeStatus(f, status) {
  try {
    const res = await updateFeedbackStatus(f.id, { status })
    const idx = feedbacks.value.findIndex((x) => x.id === f.id)
    if (idx >= 0) feedbacks.value[idx] = res.data
  } catch {
    // 更新失败
  }
}

function canDelete(f) {
  return f.authorId === auth.user?.id || isAdmin.value
}

function formatDate(date) {
  const d = new Date(date)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<template>
  <div class="feedback-page">
    <div class="feedback-header">
      <router-link to="/home" class="back-link">← 返回</router-link>
      <h2>院长信箱</h2>
      <button class="submit-btn" @click="showForm = !showForm">{{ showForm ? '取消' : '+ 投递信件' }}</button>
    </div>

    <div class="feedback-body">
      <!-- 提交表单 -->
      <div v-if="showForm" class="feedback-form">
        <div class="form-row">
          <label>类型</label>
          <select v-model="formData.type">
            <option value="bug">🐛 BUG反馈</option>
            <option value="optimization">🔧 功能优化</option>
            <option value="new_feature">✨ 功能新增</option>
            <option value="story">📖 剧情设计</option>
            <option value="other">📝 其他</option>
          </select>
        </div>
        <div class="form-row">
          <label>标题</label>
          <input v-model="formData.title" placeholder="一句话描述问题或需求" maxlength="100" />
        </div>
        <div class="form-row">
          <label>操作（可选）</label>
          <input v-model="formData.action" placeholder="你具体的操作步骤，如：点击师德墙进入页面后点击评论" maxlength="200" />
        </div>
        <div class="form-row">
          <label>详细描述</label>
          <textarea v-model="formData.content" placeholder="详细说明（可选）" rows="3"></textarea>
        </div>
        <button class="form-submit-btn" @click="submit" :disabled="!formData.title.trim()">提交</button>
      </div>

      <!-- 筛选 -->
      <div class="filter-bar">
        <button :class="['filter-btn', { active: !filterStatus }]" @click="filterStatus = ''">全部</button>
        <button
          v-for="(label, key) in statusLabels"
          :key="key"
          :class="['filter-btn', { active: filterStatus === key }]"
          @click="filterStatus = key"
        >{{ label }}</button>
      </div>

      <!-- 反馈列表 -->
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="filteredFeedbacks.length === 0" class="empty">
        <div class="empty-icon">📭</div>
        <p>信箱空空如也</p>
      </div>
      <div v-else class="feedback-list">
        <div v-for="f in filteredFeedbacks" :key="f.id" class="feedback-item">
          <div class="feedback-top">
            <span class="type-tag" :style="{ color: typeColors[f.type], borderColor: typeColors[f.type] }">{{ typeLabels[f.type] }}</span>
            <span v-if="f.source === 'ai'" class="source-tag">🤖 AI提交</span>
            <span class="feedback-date">{{ formatDate(f.createdAt) }}</span>
            <button v-if="canDelete(f)" class="delete-btn" aria-label="删除反馈" @click="remove(f.id)">×</button>
          </div>
          <div class="feedback-title">{{ f.title }}</div>
          <div v-if="f.action && f.action !== '无'" class="feedback-action">操作：{{ f.action }}</div>
          <div v-if="f.content" class="feedback-content">{{ f.content }}</div>
          <div class="feedback-bottom">
            <span class="author">{{ f.author?.nickname || f.author?.username || '匿名' }}</span>
            <div class="status-area">
              <span v-if="!isAdmin" class="status-tag" :style="{ color: statusColors[f.status] }">{{ statusLabels[f.status] }}</span>
              <select v-else v-model="f.status" class="status-select" @change="changeStatus(f, f.status)">
                <option value="open">待处理</option>
                <option value="in_progress">处理中</option>
                <option value="resolved">已解决</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feedback-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--md-bg);
}
.feedback-header {
  padding: 12px 20px;
  background: var(--md-bg-card);
  border-bottom: 1px solid var(--md-border);
  display: flex;
  align-items: center;
  gap: 12px;
}
.feedback-header h2 {
  font-family: var(--md-font-display);
  font-size: 18px;
  font-weight: 700;
  margin-right: auto;
  color: var(--md-text);
}
.back-link {
  color: var(--md-text-secondary);
  text-decoration: none;
  font-size: 13px;
}
.back-link:hover { color: var(--md-primary); }
.submit-btn {
  padding: 6px 16px;
  background: var(--md-primary);
  color: var(--md-text-on-primary);
  border: none;
  border-radius: var(--md-radius);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.submit-btn:hover { background: var(--md-primary-hover); }

.feedback-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.feedback-form {
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-lg);
  padding: 16px;
  margin-bottom: 20px;
}
.form-row {
  margin-bottom: 12px;
}
.form-row label {
  display: block;
  font-size: 12px;
  color: var(--md-text-secondary);
  margin-bottom: 4px;
  font-weight: 600;
}
.form-row input,
.form-row select,
.form-row textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius);
  background: var(--md-bg-soft);
  color: var(--md-text);
  font-size: 14px;
  font-family: var(--md-font-body);
  outline: none;
  transition: border-color 0.2s var(--md-ease-out);
}
.form-row input:focus,
.form-row select:focus,
.form-row textarea:focus { border-color: var(--md-primary); }
.form-row textarea { resize: vertical; }
.form-submit-btn {
  padding: 8px 24px;
  background: var(--md-primary);
  color: var(--md-text-on-primary);
  border: none;
  border-radius: var(--md-radius);
  font-size: 14px;
  cursor: pointer;
}
.form-submit-btn:disabled { background: var(--md-text-disabled); cursor: not-allowed; }

.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.filter-btn {
  padding: 4px 12px;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-full);
  background: var(--md-bg-card);
  color: var(--md-text-secondary);
  font-size: 12px;
  cursor: pointer;
}
.filter-btn.active {
  background: var(--md-primary-bg);
  border-color: var(--md-primary);
  color: var(--md-primary-hover);
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: var(--md-text-secondary);
  font-size: 14px;
}
.empty-icon { font-size: 40px; margin-bottom: 8px; }

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.feedback-item {
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-lg);
  padding: 14px 16px;
}
.feedback-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.type-tag {
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid;
  border-radius: var(--md-radius-full);
  font-weight: 600;
}
.source-tag {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--md-primary-bg);
  border-radius: var(--md-radius-sm);
  color: var(--md-primary-hover);
}
.feedback-date {
  font-size: 11px;
  color: var(--md-text-disabled);
  margin-left: auto;
}
.delete-btn {
  background: none;
  border: none;
  color: var(--md-text-disabled);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}
.delete-btn:hover { color: var(--md-danger); }
.feedback-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--md-text);
  margin-bottom: 4px;
}
.feedback-action {
  font-size: 12px;
  color: var(--md-accent);
  margin-bottom: 4px;
  line-height: 1.4;
}
.feedback-content {
  font-size: 13px;
  color: var(--md-text-secondary);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.feedback-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.author {
  font-size: 12px;
  color: var(--md-text-disabled);
}
.status-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--md-radius-full);
  background: var(--md-bg-soft);
}
.status-select {
  padding: 2px 8px;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  background: var(--md-bg-soft);
  color: var(--md-text);
  font-size: 12px;
  cursor: pointer;
  outline: none;
}
</style>
