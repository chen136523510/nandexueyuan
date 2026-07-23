<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { listPosts, createPost, deletePost, createComment, deleteComment, likePost, unlikePost } from '../api/wall'

const auth = useAuthStore()

const posts = ref([])
const loading = ref(true)
const error = ref('')

// 发帖表单
const showPostForm = ref(false)
const postContent = ref('')
const postImage = ref(null)
const postImagePreview = ref('')
const publishing = ref(false)

// 评论展开
const expandedComments = ref({})

function baseURL() {
  return import.meta.env.DEV ? 'http://localhost:3000' : ''
}

function displayName(author) {
  return author.nickname || author.username
}

function imageUrl(path) {
  if (!path) return ''
  return baseURL() + path
}

function formatTime(time) {
  const d = new Date(time)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 172800) return '昨天'
  return d.toLocaleDateString('zh-CN')
}

// ===== 数据加载 =====
async function fetchPosts() {
  loading.value = true
  error.value = ''
  try {
    const res = await listPosts()
    posts.value = res.data.posts
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

// ===== 发帖 =====
function onImageSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  postImage.value = file
  postImagePreview.value = URL.createObjectURL(file)
}

function clearImage() {
  postImage.value = null
  postImagePreview.value = ''
  const input = document.getElementById('wall-image-input')
  if (input) input.value = ''
}

async function handlePublish() {
  if (!postContent.value.trim() && !postImage.value) return
  publishing.value = true
  try {
    const formData = new FormData()
    if (postContent.value.trim()) formData.append('content', postContent.value.trim())
    if (postImage.value) formData.append('image', postImage.value)

    const res = await createPost(formData)
    posts.value.unshift(res.data)
    postContent.value = ''
    clearImage()
    showPostForm.value = false
  } catch (e) {
    alert(e.message || '发布失败')
  } finally {
    publishing.value = false
  }
}

// ===== 删除动态 =====
async function handleDeletePost(post) {
  if (!confirm('确定删除这条动态？')) return
  try {
    await deletePost(post.id)
    posts.value = posts.value.filter((p) => p.id !== post.id)
  } catch (e) {
    alert(e.message || '删除失败')
  }
}

function canDeletePost(post) {
  if (!auth.user) return false
  return post.author.id === auth.user.id || ['admin', 'super_admin'].includes(auth.role)
}

// ===== 点赞 =====
async function handleLike(post) {
  try {
    if (post.liked) {
      const res = await unlikePost(post.id)
      post.liked = false
      post.likeCount = res.data.likeCount
    } else {
      const res = await likePost(post.id)
      post.liked = true
      post.likeCount = res.data.likeCount
    }
  } catch (e) {
    alert(e.message || '操作失败')
  }
}

// ===== 评论 =====
const commentText = ref({})

async function handleComment(post) {
  const text = (commentText.value[post.id] || '').trim()
  if (!text) return
  try {
    const res = await createComment(post.id, text)
    post.comments.push(res.data)
    post.commentCount = post.comments.length
    commentText.value[post.id] = ''
    expandedComments.value[post.id] = true
  } catch (e) {
    alert(e.message || '评论失败')
  }
}

async function handleDeleteComment(post, comment) {
  if (!confirm('确定删除这条评论？')) return
  try {
    await deleteComment(comment.id)
    post.comments = post.comments.filter((c) => c.id !== comment.id)
    post.commentCount = post.comments.length
  } catch (e) {
    alert(e.message || '删除失败')
  }
}

function canDeleteComment(comment) {
  if (!auth.user) return false
  return comment.author.id === auth.user.id || ['admin', 'super_admin'].includes(auth.role)
}

function toggleComments(postId) {
  expandedComments.value[postId] = !expandedComments.value[postId]
}

onMounted(() => {
  auth.fetchMe()
  fetchPosts()
})
</script>

<template>
  <div class="wall-page">
    <!-- 顶部导航 -->
    <nav class="topbar">
      <router-link to="/home" class="topbar-brand">男德学院</router-link>
      <div class="topbar-menu">
        <router-link to="/home" class="menu-item">首页</router-link>
        <router-link to="/chat" class="menu-item">男德通</router-link>
        <router-link to="/wall" class="menu-item active">男德墙</router-link>
        <router-link v-if="auth.role === 'super_admin' || auth.role === 'admin'" to="/admin" class="menu-item">男通讯录</router-link>
        <router-link to="/nde" class="menu-item">德塔</router-link>
      </div>
      <router-link to="/home" class="topbar-back">← 返回首页</router-link>
    </nav>

    <!-- 内容区 -->
    <div class="wall-container">
      <!-- 标题 + 发帖按钮 -->
      <div class="wall-header">
        <h1 class="wall-title">🧱 男德墙</h1>
        <button class="btn-publish" @click="showPostForm = !showPostForm">
          {{ showPostForm ? '收起' : '+ 发动态' }}
        </button>
      </div>

      <!-- 发帖表单 -->
      <div v-if="showPostForm" class="post-form">
        <textarea
          v-model="postContent"
          class="post-textarea"
          placeholder="写点什么..."
          maxlength="500"
          rows="3"
        />
        <div class="post-form-footer">
          <label class="image-btn">
            📷 图片
            <input id="wall-image-input" type="file" accept="image/*" @change="onImageSelect" hidden />
          </label>
          <div class="post-form-right">
            <span class="char-count">{{ postContent.length }}/500</span>
            <button class="btn-submit" :disabled="publishing || (!postContent.trim() && !postImage)" @click="handlePublish">
              {{ publishing ? '发布中...' : '发布' }}
            </button>
          </div>
        </div>
        <div v-if="postImagePreview" class="image-preview">
          <img :src="postImagePreview" alt="预览" />
          <button class="remove-image" @click="clearImage">✕</button>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="empty-state">
        <p>加载中...</p>
      </div>

      <!-- 错误 -->
      <div v-else-if="error" class="empty-state">
        <p>{{ error }}</p>
        <button @click="fetchPosts" class="btn-retry">重试</button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="posts.length === 0" class="empty-state">
        <p>墙上还空空如也，来发第一条吧</p>
      </div>

      <!-- 动态列表 -->
      <div v-else class="post-list">
        <div v-for="post in posts" :key="post.id" class="post-card">
          <!-- 作者信息 -->
          <div class="post-author">
            <div class="post-avatar">{{ displayName(post.author).charAt(0) }}</div>
            <div class="post-author-info">
              <span class="post-author-name">{{ displayName(post.author) }}</span>
              <span class="post-time">{{ formatTime(post.createdAt) }}</span>
            </div>
            <button v-if="canDeletePost(post)" class="btn-delete-post" @click="handleDeletePost(post)">删除</button>
          </div>

          <!-- 文字内容 -->
          <p v-if="post.content" class="post-content">{{ post.content }}</p>

          <!-- 图片 -->
          <div v-if="post.image" class="post-image-wrapper">
            <img :src="imageUrl(post.image)" alt="动态图片" class="post-image" />
          </div>

          <!-- 互动栏 -->
          <div class="post-actions">
            <button class="action-btn" :class="{ liked: post.liked }" @click="handleLike(post)">
              {{ post.liked ? '❤️' : '🤍' }} {{ post.likeCount }}
            </button>
            <button class="action-btn" @click="toggleComments(post.id)">
              💬 {{ post.commentCount }}
            </button>
          </div>

          <!-- 评论区 -->
          <div v-if="expandedComments[post.id]" class="comment-section">
            <div v-for="comment in post.comments" :key="comment.id" class="comment-item">
              <div class="comment-avatar">{{ displayName(comment.author).charAt(0) }}</div>
              <div class="comment-body">
                <span class="comment-author">{{ displayName(comment.author) }}</span>
                <span class="comment-text">{{ comment.content }}</span>
                <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                <button v-if="canDeleteComment(comment)" class="btn-delete-comment" @click="handleDeleteComment(post, comment)">删除</button>
              </div>
            </div>

            <!-- 评论输入框 -->
            <div class="comment-input-row">
              <input
                v-model="commentText[post.id]"
                class="comment-input"
                placeholder="写评论..."
                maxlength="500"
                @keyup.enter="handleComment(post)"
              />
              <button class="btn-comment" @click="handleComment(post)">发送</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wall-page {
  min-height: 100vh;
  background: var(--md-bg);
  display: flex;
  flex-direction: column;
}

/* 顶部导航（复用 MainView 风格） */
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
  text-decoration: none;
}
.topbar-menu {
  display: flex;
  gap: 4px;
}
.menu-item {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--md-text-secondary);
  text-decoration: none;
  transition: all 0.2s;
}
.menu-item:hover {
  background: var(--md-primary-bg);
  color: var(--md-primary);
}
.menu-item.active {
  background: var(--md-primary-bg);
  color: var(--md-primary);
  font-weight: 600;
}
.topbar-back {
  font-size: 13px;
  color: var(--md-text-secondary);
  text-decoration: none;
}

/* 内容区 */
.wall-container {
  max-width: 680px;
  width: 100%;
  margin: 0 auto;
  padding: 20px 16px 60px;
  flex: 1;
}

/* 标题 */
.wall-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.wall-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--md-text);
  margin: 0;
}
.btn-publish {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: var(--md-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-publish:hover {
  background: var(--md-primary-hover);
}

/* 发帖表单 */
.post-form {
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}
.post-textarea {
  width: 100%;
  border: none;
  resize: none;
  font-size: 15px;
  line-height: 1.6;
  color: var(--md-text);
  background: transparent;
  outline: none;
  font-family: inherit;
}
.post-form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}
.image-btn {
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--md-bg-soft);
  font-size: 13px;
  color: var(--md-text-secondary);
  cursor: pointer;
  transition: background 0.2s;
}
.image-btn:hover {
  background: var(--md-secondary-bg);
}
.post-form-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.char-count {
  font-size: 12px;
  color: var(--md-text-disabled);
}
.btn-submit {
  padding: 7px 20px;
  border-radius: 8px;
  border: none;
  background: var(--md-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-submit:not(:disabled):hover {
  background: var(--md-primary-hover);
}
.image-preview {
  position: relative;
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
}
.image-preview img {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  display: block;
}
.remove-image {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--md-text-secondary);
  font-size: 15px;
}
.btn-retry {
  margin-top: 12px;
  padding: 6px 18px;
  border-radius: 8px;
  border: 1px solid var(--md-border);
  background: var(--md-bg-card);
  color: var(--md-primary);
  cursor: pointer;
  font-size: 14px;
}

/* 动态卡片 */
.post-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.post-card {
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: 12px;
  padding: 16px;
}

/* 作者信息 */
.post-author {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.post-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--md-primary-bg);
  color: var(--md-primary);
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.post-author-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.post-author-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--md-text);
}
.post-time {
  font-size: 12px;
  color: var(--md-text-disabled);
}
.btn-delete-post {
  margin-left: auto;
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--md-danger);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-delete-post:hover {
  background: rgba(201, 160, 160, 0.1);
}

/* 文字内容 */
.post-content {
  font-size: 15px;
  line-height: 1.7;
  color: var(--md-text);
  margin: 0 0 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 图片 */
.post-image-wrapper {
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}
.post-image {
  width: 100%;
  max-height: 500px;
  object-fit: cover;
  display: block;
  cursor: pointer;
}

/* 互动栏 */
.post-actions {
  display: flex;
  gap: 20px;
  padding-top: 8px;
  border-top: 1px solid var(--md-divider);
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--md-text-secondary);
  cursor: pointer;
  transition: color 0.2s;
}
.action-btn:hover {
  color: var(--md-primary);
}
.action-btn.liked {
  color: var(--md-danger);
}

/* 评论区 */
.comment-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--md-divider);
}
.comment-item {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.comment-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--md-secondary-bg);
  color: var(--md-secondary);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.comment-body {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
}
.comment-author {
  font-weight: 600;
  color: var(--md-text);
  margin-right: 6px;
}
.comment-text {
  color: var(--md-text);
}
.comment-time {
  display: inline-block;
  margin-left: 8px;
  font-size: 11px;
  color: var(--md-text-disabled);
}
.btn-delete-comment {
  margin-left: 8px;
  padding: 0 6px;
  border: none;
  background: transparent;
  color: var(--md-danger);
  font-size: 11px;
  cursor: pointer;
}
.btn-delete-comment:hover {
  text-decoration: underline;
}

/* 评论输入 */
.comment-input-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.comment-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--md-border);
  background: var(--md-bg-soft);
  font-size: 14px;
  color: var(--md-text);
  outline: none;
  transition: border-color 0.2s;
}
.comment-input:focus {
  border-color: var(--md-primary);
}
.btn-comment {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--md-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-comment:hover {
  background: var(--md-primary-hover);
}

/* 响应式 */
@media (max-width: 640px) {
  .wall-container {
    padding: 16px 12px 40px;
  }
  .topbar {
    padding: 0 12px;
  }
  .topbar-menu {
    gap: 2px;
  }
  .menu-item {
    padding: 6px 8px;
    font-size: 13px;
  }
  .topbar-back {
    display: none;
  }
}
</style>
