<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { listSessions, getSession, deleteSession } from '../api/chat'
import { createFeedback } from '../api/feedback'
import { useDialogStore } from '../stores/dialog'
import { renderMarkdown } from '../utils/markdown'

const dialog = useDialogStore()

const messages = ref([])
const question = ref('')
const loading = ref(false)
const chatArea = ref(null)
const currentSessionId = ref(null)
const sessions = ref([])
const abortController = ref(null)
// 痛点21：会话记忆压缩摘要（超10轮自动压缩，前端展示提示条）
const sessionSummary = ref(null)
const showSummaryDetail = ref(false)

// Agent 图标和标签映射
const agentIcons = {
  main: '🧠',
  person_stat: '📊',
  person_messages: '💬',
  mentioned: '🔍',
  topic_search: '🔎',
  full_analysis: '📚',
  视觉识别: '👁️',
  router: '🧭',
}
const agentLabels = {
  main: '男德通（主 Agent）',
  person_stat: '人物统计 Agent',
  person_messages: '人物发言 Agent',
  mentioned: '被提及 Agent',
  topic_search: '话题检索 Agent',
  full_analysis: '全量分析 Agent',
  视觉识别: '视觉识别 Agent',
  router: '路由分析',
}
const phaseLabels = {
  planning: '规划',
  analyzing: '分析',
  searching: '检索',
  reasoning: '推理',
  analysis: '综合分析',
  mapping: '分批摘要',
  reducing: '汇总合并',
  done: '完成',
  warning: '⚠️ 提示',
}

// 全量分析批次进度：取该 agent 步骤里最后一条带 current/total 的数据（mapping 阶段每批推一条）
function lastBatchProgress(steps) {
  for (let i = steps.length - 1; i >= 0; i--) {
    const d = steps[i]?.data
    if (d && typeof d === 'object' && !Array.isArray(d) && d.current !== undefined && d.total !== undefined) {
      return d
    }
  }
  return null
}

// ========== 人设选择 ==========
const personaOptions = [
  { id: 'tiwei', name: '体委' },
  { id: 'qiubi', name: '丘比' },
  { id: 'kaikai', name: '开开' },
  { id: 'normal', name: '正常人' },
  { id: 'custom', name: '自定义' },
]
const currentPersona = ref(localStorage.getItem('chat_persona') || 'normal')
const customPersonaDesc = ref(localStorage.getItem('chat_persona_custom') || '')

function onPersonaChange() {
  localStorage.setItem('chat_persona', currentPersona.value)
}

function onCustomDescChange() {
  localStorage.setItem('chat_persona_custom', customPersonaDesc.value)
}
const sidebarOpen = ref(window.innerWidth > 768)
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)

// ========== 图片上传（多模态一期）==========
const pendingImages = ref([])  // 待发送图片 [{file, preview}]
const imageInput = ref(null)
const uploadingImages = ref(false)
const MAX_IMAGES = 3

function pickImages() {
  if (pendingImages.value.length >= MAX_IMAGES || loading.value) return
  imageInput.value?.click()
}

function onImagesPicked(e) {
  const files = Array.from(e.target.files || [])
  for (const f of files) {
    if (pendingImages.value.length >= MAX_IMAGES) break
    if (f.size > 4 * 1024 * 1024) {
      dialog.alert(`「${f.name}」超过 4MB 限制`)
      continue
    }
    pendingImages.value.push({ file: f, preview: URL.createObjectURL(f) })
  }
  e.target.value = '' // 允许重复选同一张
}

function removePendingImage(idx) {
  URL.revokeObjectURL(pendingImages.value[idx].preview)
  pendingImages.value.splice(idx, 1)
}

async function uploadImages() {
  const urls = []
  for (const img of pendingImages.value) {
    const fd = new FormData()
    fd.append('image', img.file)
    const res = await fetch('/api/chat/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: fd,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `图片「${img.file.name}」上传失败`)
    }
    const data = await res.json()
    urls.push(data.data.url)
  }
  return urls
}

function onResize() {
  windowWidth.value = window.innerWidth
  // 桌面端自动展开 sidebar，移动端自动收起
  if (window.innerWidth > 768) sidebarOpen.value = true
  else sidebarOpen.value = false
}

const suggestions = [
  '群里发言最多的人是谁',
  '大家讨论过打球吗',
  '群里谁喷人最多',
  '饶志锐发了多少条消息',
]

onMounted(() => {
  loadSessions()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})

async function loadSessions() {
  try {
    const res = await listSessions()
    sessions.value = res.data || []
  } catch {
    sessions.value = []
  }
}

async function selectSession(id) {
  if (loading.value) return
  currentSessionId.value = id
  messages.value = []
  sessionSummary.value = null
  showSummaryDetail.value = false

  try {
    const res = await getSession(id)
    const turns = res.data?.turns || []
    // 恢复会话记忆压缩摘要（痛点21）
    if (res.data?.summary) {
      sessionSummary.value = res.data.summary
    }
    for (const t of turns) {
      messages.value.push({
        role: t.role === 'assistant' ? 'bot' : 'user',
        content: t.content,
        images: t.images ? (typeof t.images === 'string' ? JSON.parse(t.images) : t.images) : [],
        intent: t.intent || null,
        sources: t.sources ? (typeof t.sources === 'string' ? JSON.parse(t.sources) : t.sources) : [],
      })
    }
    await scrollBottom()
  } catch {
    // 加载失败
  }
}

function newChat() {
  if (loading.value) return
  currentSessionId.value = null
  messages.value = []
  sessionSummary.value = null
  showSummaryDetail.value = false
}

async function deleteChat(id, e) {
  e.stopPropagation()
  if (!await dialog.confirm('确定删除这个会话？', { danger: true })) return
  try {
    await deleteSession(id)
    sessions.value = sessions.value.filter((s) => s.id !== id)
    if (currentSessionId.value === id) {
      newChat()
    }
  } catch {
    // 删除失败
  }
}

function stopGeneration() {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
  loading.value = false
}

function copyMessage(msg) {
  navigator.clipboard.writeText(msg.content).then(() => {
    msg._copied = true
    setTimeout(() => { msg._copied = false }, 2000)
  })
}

const feedbackTypeLabels = {
  bug: '🐛 BUG反馈',
  optimization: '🔧 功能优化',
  new_feature: '✨ 功能新增',
  story: '📖 剧情设计',
  other: '📝 其他',
}

async function confirmSubmitFeedback(msg) {
  const fb = msg.feedback
  try {
    const res = await createFeedback({
      type: fb.type,
      title: fb.title,
      action: fb.action || '无',
      content: fb.content,
      source: 'ai',
    })
    msg.feedback._submitted = true
    msg.feedback._error = false
  } catch {
    msg.feedback._error = true
  }
}

function dismissFeedback(msg) {
  msg.feedback = null
}

async function ask(q) {
  const text = (q || question.value).trim()
  const hasImgs = pendingImages.value.length > 0
  if ((!text && !hasImgs) || loading.value) return

  // 先上传图片拿 URL（失败则中断，不清空输入让用户重试）
  let imageUrls = []
  if (hasImgs) {
    uploadingImages.value = true
    try {
      imageUrls = await uploadImages()
    } catch (err) {
      dialog.alert(err.message || '图片上传失败，请重试')
      uploadingImages.value = false
      return
    }
    uploadingImages.value = false
  }

  const displayText = text || '[图片]'
  messages.value.push({ role: 'user', content: displayText, images: imageUrls })

  // 创建 bot 消息占位（用于流式更新）
  const botMsg = {
    role: 'bot',
    content: '',
    thinking: '',
    agentSteps: {},  // { router: [...], statistic: [...], semantic: [...], main: [...] }
    intent: null,
    sources: [],
    showThinking: true,
  }
  messages.value.push(botMsg)
  question.value = ''
  for (const img of pendingImages.value) URL.revokeObjectURL(img.preview)
  pendingImages.value = []
  loading.value = true
  await scrollBottom()

  try {
    const token = localStorage.getItem('token')
    abortController.value = new AbortController()
    const response = await fetch('/api/chat/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question: displayText,
        images: imageUrls.length ? imageUrls : undefined,
        sessionId: currentSessionId.value,
        personaId: currentPersona.value,
        customDesc: currentPersona.value === 'custom' ? customPersonaDesc.value : undefined,
      }),
      signal: abortController.value.signal,
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      botMsg.content = errData.message || `请求失败 (${response.status})`
      botMsg.error = true
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop()

      for (const block of blocks) {
        const lines = block.split('\n')
        let eventType = ''
        let dataStr = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim()
          else if (line.startsWith('data: ')) dataStr = line.slice(6)
        }
        if (!eventType || !dataStr) continue

        try {
          const data = JSON.parse(dataStr)
          if (eventType === 'agent_thinking') {
            // 多 Agent 结构化思考过程
            const agent = data.agent || 'unknown'
            if (!botMsg.agentSteps[agent]) botMsg.agentSteps[agent] = []
            botMsg.agentSteps[agent].push({
              phase: data.phase,
              content: data.content,
              data: data.data,
            })
          } else if (eventType === 'thinking') {
            // 兼容旧版 thinking 事件
            if (data.step) {
              botMsg.thinking += data.step + '\n'
            }
            if (data.content) {
              botMsg.thinking += data.content + '\n'
            }
          } else if (eventType === 'token') {
            botMsg.content += data.content
            botMsg.showThinking = false
          } else if (eventType === 'sources') {
            botMsg.sources = data
          } else if (eventType === 'feedback_created') {
            botMsg.feedback = data
          } else if (eventType === 'history_compressed') {
            // 痛点21：早期对话已压缩为摘要，展示提示条（不弹窗不打断，用户可展开查看）
            sessionSummary.value = data.summary
          } else if (eventType === 'done') {
            currentSessionId.value = data.sessionId
            botMsg.intent = data.intent
            loadSessions()
          } else if (eventType === 'error') {
            botMsg.content = data.message
            botMsg.error = true
          }
        } catch {
          // 忽略解析错误
        }
      }
      await scrollBottom()
    }
  } catch (err) {
    // 用户主动停止（abort），不报错，保留已生成的部分回答
    if (err.name === 'AbortError') {
      if (!botMsg.content) botMsg.content = '（已停止）'
    } else {
      botMsg.content = err.message || '网络错误，请重试'
      botMsg.error = true
    }
  }

  abortController.value = null
  loading.value = false
  await scrollBottom()
}

function handleEnter(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    ask()
  }
}

async function scrollBottom() {
  await nextTick()
  chatArea.value?.scrollTo({ top: chatArea.value.scrollHeight, behavior: 'smooth' })
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
  <div class="chat-page">
    <div class="chat-header">
      <router-link to="/home" class="back-link">← 返回</router-link>
      <h2>男德通</h2>
      <button class="toggle-btn" aria-label="切换侧边栏" data-testid="chat-toggle-sidebar" @click="sidebarOpen = !sidebarOpen">☰</button>
    </div>

    <div class="chat-body">
      <!-- 移动端遮罩（窄屏时 sidebar 以 overlay 形式出现） -->
      <div v-if="sidebarOpen && isMobile" class="sidebar-overlay" @click="sidebarOpen = false"></div>
      <div v-if="sidebarOpen" class="sidebar">
        <div class="persona-selector">
          <label class="persona-label">🎭 人设</label>
          <select v-model="currentPersona" @change="onPersonaChange" class="persona-select">
            <option v-for="p in personaOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <textarea
            v-if="currentPersona === 'custom'"
            v-model="customPersonaDesc"
            @input="onCustomDescChange"
            class="persona-custom-input"
            placeholder="描述你想要的人设风格，如：你是一个古代军师，说话文绉绉的"
            rows="2"
          ></textarea>
        </div>
        <button class="new-chat-btn" @click="newChat">+ 新建对话</button>
        <div class="session-list">
          <div
            v-for="s in sessions"
            :key="s.id"
            :class="['session-item', { active: s.id === currentSessionId }]"
            @click="selectSession(s.id)"
          >
            <div class="session-info">
              <div class="session-title">{{ s.title || '新对话' }}</div>
              <div class="session-meta">
                {{ formatDate(s.updatedAt) }} · {{ s._count?.turns || 0 }} 条
              </div>
            </div>
            <button class="delete-btn" aria-label="删除会话" data-testid="chat-delete-session" @click="deleteChat(s.id, $event)" title="删除">×</button>
          </div>
          <div v-if="sessions.length === 0" class="no-sessions">暂无历史会话</div>
        </div>
      </div>

      <div class="chat-main">
        <div class="chat-area" ref="chatArea">
          <div v-if="messages.length === 0" class="empty">
            <div class="empty-icon">💬</div>
            <p class="empty-title">向男德通提问吧</p>
            <div class="suggestions">
              <button v-for="s in suggestions" :key="s" @click="ask(s)">{{ s }}</button>
            </div>
          </div>

          <!-- 痛点21：早期对话压缩摘要提示条（可展开，不弹窗不打断） -->
          <div v-if="sessionSummary" class="summary-banner">
            <details>
              <summary>💾 更早对话已自动压缩（点击展开查看摘要）</summary>
              <div class="summary-content">{{ sessionSummary }}</div>
            </details>
          </div>

          <div v-for="(msg, i) in messages" :key="i" :class="['msg', msg.role]">
            <!-- 多 Agent 思考过程 -->
            <div v-if="(msg.agentSteps && Object.keys(msg.agentSteps).length > 0) && msg.role === 'bot'" class="msg-agent-thinking">
              <details :open="msg.showThinking">
                <summary>💭 思考过程</summary>
                <div class="agent-steps">
                  <div
                    v-for="(steps, agentKey) in msg.agentSteps"
                    :key="agentKey"
                    :class="['agent-group', 'agent-' + agentKey]"
                  >
                    <div class="agent-label">
                      {{ agentIcons[agentKey] || '🔧' }} {{ agentLabels[agentKey] || agentKey }}
                      <span v-if="steps[steps.length-1]?.data?.count !== undefined" class="agent-count">
                        {{ steps[steps.length-1].data.count }} 条
                      </span>
                      <!-- 全量分析批次进度（data.current/total，映射 mapping 阶段每批一条） -->
                      <span
                        v-if="agentKey === 'full_analysis' && lastBatchProgress(steps)"
                        class="agent-count batch-progress"
                      >
                        第 {{ lastBatchProgress(steps).current }}/{{ lastBatchProgress(steps).total }} 批
                      </span>
                    </div>
                    <div v-for="(step, si) in steps" :key="si" class="agent-step">
                      <span v-if="step.phase" :class="['step-phase', { warning: step.phase === 'warning' }]">{{ phaseLabels[step.phase] || step.phase }}</span>
                      <span v-if="step.content" :class="['step-content', { warning: step.phase === 'warning' }]">{{ step.content }}</span>
                      <div v-if="step.data && Array.isArray(step.data)" class="step-data">
                        <div v-for="(row, ri) in step.data.slice(0, 5)" :key="ri" class="data-row">
                          {{ typeof row === 'string' ? row : JSON.stringify(row) }}
                        </div>
                        <span v-if="step.data.length > 5" class="data-more">...共 {{ step.data.length }} 条</span>
                      </div>
                      <div v-else-if="step.data && typeof step.data === 'object'" class="step-data">
                        <div v-for="(val, key) in step.data" :key="key" class="data-row">
                          <span class="data-key">{{ key }}:</span> {{ JSON.stringify(val) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>

            <!-- 兼容旧版思考过程（纯文本） -->
            <div v-else-if="msg.thinking && msg.role === 'bot'" class="msg-thinking">
              <details :open="msg.showThinking">
                <summary>💭 思考过程</summary>
                <pre class="thinking-content">{{ msg.thinking }}</pre>
              </details>
            </div>

            <!-- 回答气泡 -->
            <div class="msg-bubble" :class="{ error: msg.error }">
              <!-- 用户消息的图片缩略图（多模态一期） -->
              <div v-if="msg.role === 'user' && msg.images?.length" class="msg-images">
                <img
                  v-for="(img, i) in msg.images"
                  :key="i"
                  :src="img"
                  class="msg-image-thumb"
                  :alt="`用户发送的图片${i + 1}`"
                  loading="lazy"
                />
              </div>
              <div v-if="msg.role === 'bot' && msg.content" class="markdown-body" v-html="renderMarkdown(msg.content)"></div>
              <template v-else-if="msg.content">{{ msg.content }}</template>
              <div v-else-if="loading && msg.role === 'bot'" class="msg-thinking-placeholder">
                <span class="spinner"></span> 正在思考...
              </div>
            </div>

            <!-- 复制按钮（仅 bot 消息且有内容） -->
            <button
              v-if="msg.role === 'bot' && msg.content && !msg.error"
              class="copy-btn"
              @click="copyMessage(msg)"
              :title="msg._copied ? '已复制' : '复制回答'"
            >
              {{ msg._copied ? '✓ 已复制' : '⎘ 复制' }}
            </button>

            <!-- AI 生成的反馈确认卡片（用户确认后才提交） -->
            <div v-if="msg.feedback" class="msg-feedback-card">
              <div v-if="!msg.feedback._submitted" class="feedback-confirm">
                <div class="feedback-card-title">📋 男德通帮你起草了一封院长信箱，确认投递吗？</div>
                <div class="feedback-card-row"><span class="row-label">类型</span>{{ feedbackTypeLabels[msg.feedback.type] || msg.feedback.type }}</div>
                <div class="feedback-card-row"><span class="row-label">标题</span>{{ msg.feedback.title }}</div>
                <div class="feedback-card-row"><span class="row-label">操作</span>{{ msg.feedback.action || '无' }}</div>
                <div class="feedback-card-row"><span class="row-label">描述</span>{{ msg.feedback.content }}</div>
                <div class="feedback-card-actions">
                  <button class="feedback-confirm-btn" @click="confirmSubmitFeedback(msg)">✓ 确认投递</button>
                  <button class="feedback-dismiss-btn" @click="dismissFeedback(msg)">取消</button>
                </div>
                <div v-if="msg.feedback._error" class="feedback-error">提交失败，请稍后重试</div>
              </div>
              <div v-else class="feedback-submitted">
                ✅ 信件已投递！<router-link to="/mailbox" class="feedback-link">查看</router-link>
              </div>
            </div>

            <div v-if="msg.intent" class="msg-meta">
              <span class="intent-tag">{{ msg.intent }}</span>
            </div>
            <div v-if="msg.sources && msg.sources.length" class="msg-sources">
              <details>
                <summary>📎 引用来源 ({{ msg.sources.length }})</summary>
                <div v-for="(s, j) in msg.sources" :key="j" class="source-item">
                  <div class="source-head">
                    <span class="source-name">{{ s.nickname }}</span>
                    <span class="source-time">{{ new Date(s.msgTime).toLocaleString('zh-CN') }}</span>
                  </div>
                  <p class="source-text">{{ s.content }}</p>
                </div>
              </details>
            </div>
          </div>
        </div>

        <div class="input-area">
          <!-- 待发送图片预览条（多模态一期） -->
          <div v-if="pendingImages.length" class="pending-images">
            <div v-for="(img, i) in pendingImages" :key="i" class="pending-img">
              <img :src="img.preview" :alt="img.file.name" />
              <button class="pending-img-remove" @click="removePendingImage(i)" :disabled="loading || uploadingImages" aria-label="移除图片">×</button>
            </div>
          </div>
          <div class="input-row">
            <input
              v-model="question"
              @keydown="handleEnter"
              placeholder="输入问题，回车提问..."
              :disabled="loading"
            />
            <button
              class="img-btn"
              @click="pickImages"
              :disabled="loading || uploadingImages || pendingImages.length >= MAX_IMAGES"
              :title="pendingImages.length >= MAX_IMAGES ? `最多${MAX_IMAGES}张` : '上传图片'"
              aria-label="上传图片"
            >
              🖼️
            </button>
            <input ref="imageInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple style="display:none" @change="onImagesPicked" />
            <button v-if="loading" class="stop-btn" @click="stopGeneration">
              ⏹ 停止
            </button>
            <button v-else @click="ask()" :disabled="!question.trim() && !pendingImages.length">
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh; /* iOS 地址栏收起时用动态视口 */
  background: var(--md-bg);
}

/* 移动端底部导航显示时：页面高度让出底栏，输入框不被遮住 */
:global(body.has-bottom-nav) .chat-page {
  height: calc(100vh - 64px - env(safe-area-inset-bottom, 0px));
  height: calc(100dvh - 64px - env(safe-area-inset-bottom, 0px));
}

.chat-header {
  padding: 12px 20px;
  background: var(--md-bg-card);
  border-bottom: 1px solid var(--md-border);
  display: flex;
  align-items: center;
  gap: 12px;
}
.chat-header h2 {
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
  transition: color 0.2s var(--md-ease-out);
}
.back-link:hover { color: var(--md-primary); }
.toggle-btn {
  background: none;
  border: none;
  color: var(--md-text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s var(--md-ease-out);
}
.toggle-btn:hover { color: var(--md-primary); }

.chat-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background: var(--md-bg-card);
  border-right: 1px solid var(--md-border);
  display: flex;
  flex-direction: column;
}
.persona-selector {
  padding: 12px;
  border-bottom: 1px solid var(--md-border);
}
.persona-label {
  display: block;
  font-size: 12px;
  color: var(--md-text-secondary);
  margin-bottom: 6px;
  font-weight: 600;
}
.persona-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  background: var(--md-bg-soft);
  color: var(--md-text);
  font-size: 13px;
  font-family: var(--md-font-body);
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s var(--md-ease-out);
}
.persona-select:focus { border-color: var(--md-primary); }
.persona-custom-input {
  width: 100%;
  margin-top: 6px;
  padding: 6px 8px;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  background: var(--md-bg-soft);
  color: var(--md-text);
  font-size: 12px;
  font-family: var(--md-font-body);
  resize: vertical;
  outline: none;
  transition: border-color 0.2s var(--md-ease-out);
}
.persona-custom-input:focus { border-color: var(--md-primary); }
.new-chat-btn {
  margin: 12px;
  padding: 10px;
  background: var(--md-primary);
  color: var(--md-text-on-primary);
  border: none;
  border-radius: var(--md-radius);
  font-size: 14px;
  cursor: pointer;
  font-family: var(--md-font-body);
  transition: background-color 0.2s var(--md-ease-out);
}
.new-chat-btn:hover { background: var(--md-primary-hover); }
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}
.session-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: var(--md-radius);
  cursor: pointer;
  margin-bottom: 2px;
  transition: background-color 0.2s var(--md-ease-out);
}
.session-item:hover { background: var(--md-bg-soft); }
.session-item.active { background: var(--md-primary-bg); }
.session-info { flex: 1; min-width: 0; }
.session-title {
  font-family: var(--md-font-body);
  font-size: 13px;
  color: var(--md-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-meta { font-size: 11px; color: var(--md-text-disabled); margin-top: 2px; }
.delete-btn {
  background: none;
  border: none;
  color: var(--md-text-disabled);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.2s var(--md-ease-out);
}
.delete-btn:hover { color: var(--md-danger); }
.no-sessions {
  text-align: center;
  color: var(--md-text-secondary);
  font-size: 13px;
  padding: 20px;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty {
  text-align: center;
  padding-top: 80px;
}
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-title {
  font-family: var(--md-font-display);
  font-size: 16px;
  color: var(--md-text-secondary);
  margin-bottom: 24px;
}
.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 600px;
  margin: 0 auto;
}
.suggestions button {
  padding: 8px 16px;
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-full);
  font-family: var(--md-font-body);
  font-size: 13px;
  color: var(--md-text-secondary);
  cursor: pointer;
  transition: background-color 0.2s var(--md-ease-out), border-color 0.2s var(--md-ease-out), color 0.2s var(--md-ease-out);
}
.suggestions button:hover {
  background: var(--md-primary-bg);
  border-color: var(--md-primary);
  color: var(--md-primary-hover);
}

/* 痛点21：早期对话压缩摘要提示条 */
.summary-banner {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--md-primary-bg, #f0f4f0);
  border: 1px dashed var(--md-primary, #6b8e6b);
  border-radius: 8px;
  font-size: 12px;
  color: var(--md-text-secondary, #666);
}
.summary-banner summary {
  cursor: pointer;
  user-select: none;
}
.summary-banner .summary-content {
  margin-top: 8px;
  white-space: pre-wrap;
  line-height: 1.6;
  color: var(--md-text-primary, #333);
}

.msg {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}
.msg.user { align-items: flex-end; }
.msg.bot { align-items: flex-start; }

/* 思考过程 */
.msg-thinking {
  max-width: 75%;
  margin-bottom: 8px;
  font-size: 12px;
}
.msg-thinking summary {
  cursor: pointer;
  color: var(--md-text-disabled);
  padding: 4px 8px;
  user-select: none;
}
.msg-thinking summary:hover { color: var(--md-text-secondary); }
.thinking-content {
  background: var(--md-bg-soft);
  border: 1px solid var(--md-divider);
  border-radius: var(--md-radius);
  padding: 10px 12px;
  margin-top: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--md-text-secondary);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

/* 多 Agent 思考过程 */
.msg-agent-thinking {
  width: 100%;
  margin-bottom: 4px;
}
.msg-agent-thinking details {
  background: var(--md-bg-soft);
  border: 1px solid var(--md-divider);
  border-radius: var(--md-radius-lg);
  padding: 8px 12px;
}
.msg-agent-thinking summary {
  cursor: pointer;
  font-size: 13px;
  color: var(--md-text-secondary);
  user-select: none;
  font-weight: 500;
}
.agent-steps {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.agent-group {
  border-radius: var(--md-radius);
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
}
.agent-router { background: var(--md-secondary-bg); border-left: 3px solid var(--md-secondary); }
.agent-statistic, .agent-person_stat { background: rgba(212, 165, 116, 0.12); border-left: 3px solid var(--md-accent); }
.agent-semantic, .agent-mentioned { background: var(--md-primary-bg); border-left: 3px solid var(--md-primary); }
.agent-topic_search { background: rgba(174, 194, 207, 0.18); border-left: 3px solid var(--md-secondary); }
.agent-person_messages { background: rgba(201, 160, 160, 0.12); border-left: 3px solid var(--md-danger); }
.agent-full_analysis { background: rgba(154, 173, 118, 0.15); border-left: 3px solid #7d8f5a; }
.agent-main { background: var(--md-primary-bg); border-left: 3px solid var(--md-primary-hover); }
.agent-label {
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 4px;
  opacity: 0.9;
  color: var(--md-text);
}
.agent-step {
  color: var(--md-text-secondary);
  margin-bottom: 2px;
}
.step-content {
  display: block;
  word-break: break-word;
}
.step-phase {
  display: inline-block;
  font-size: 10px;
  color: var(--md-text-disabled);
  background: var(--md-divider);
  padding: 1px 4px;
  border-radius: 3px;
  margin-right: 4px;
}
.step-phase.warning {
  color: #b8860b;
  background: rgba(212, 165, 116, 0.15);
}
.step-content.warning {
  color: var(--md-accent);
  font-weight: 500;
}
.agent-count {
  font-size: 11px;
  color: var(--md-text-disabled);
  font-weight: normal;
  margin-left: 4px;
}
.batch-progress {
  color: var(--md-accent);
  font-weight: 600;
}
.data-key {
  font-weight: 600;
  color: var(--md-text-secondary);
}
.step-sql {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: var(--md-accent);
  background: rgba(212, 165, 116, 0.08);
  padding: 2px 6px;
  border-radius: var(--md-radius-sm);
  margin-top: 2px;
}
.step-data {
  margin-top: 4px;
  padding-left: 8px;
  border-left: 2px solid var(--md-divider);
}
.data-row {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: var(--md-text-secondary);
  padding: 1px 0;
}
.msg-row {
  font-size: 11px;
  padding: 2px 0;
  color: var(--md-text-secondary);
}
.msg-row-name {
  font-weight: 600;
  color: var(--md-primary-hover);
  margin-right: 6px;
}
.msg-row-text {
  color: var(--md-text-secondary);
}
.data-more {
  font-size: 11px;
  color: var(--md-text-disabled);
  font-style: italic;
}

.msg-bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: var(--md-radius-lg);
  font-family: var(--md-font-body);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}
.msg.user .msg-bubble {
  background: var(--md-primary);
  color: var(--md-text-on-primary);
  border-bottom-right-radius: 4px;
  white-space: pre-wrap;
}
.msg.bot .msg-bubble {
  background: var(--md-bg-card);
  color: var(--md-text);
  border: 1px solid var(--md-border);
  border-bottom-left-radius: 4px;
}
.msg-bubble.error {
  background: rgba(201, 160, 160, 0.12);
  border-color: var(--md-danger);
  color: var(--md-danger);
}

/* Markdown 渲染样式 */
.markdown-body :deep(p) { margin: 0 0 8px; }
.markdown-body :deep(p:last-child) { margin-bottom: 0; }
.markdown-body :deep(strong) { font-weight: 700; }
.markdown-body :deep(em) { font-style: italic; }
.markdown-body :deep(del) { text-decoration: line-through; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) { margin: 4px 0 8px; padding-left: 20px; }
.markdown-body :deep(li) { margin: 2px 0; }
.markdown-body :deep(blockquote) {
  margin: 8px 0;
  padding: 4px 12px;
  border-left: 3px solid var(--md-border);
  color: var(--md-text-secondary);
  background: var(--md-bg-soft);
  border-radius: 0 var(--md-radius-sm) var(--md-radius-sm) 0;
}
.markdown-body :deep(code) {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  background: var(--md-bg-soft);
  padding: 2px 6px;
  border-radius: var(--md-radius-sm);
}
.markdown-body :deep(pre) {
  margin: 8px 0;
  padding: 10px 12px;
  background: var(--md-bg-soft);
  border: 1px solid var(--md-divider);
  border-radius: var(--md-radius);
  overflow-x: auto;
}
.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 13px;
}
.markdown-body :deep(a) {
  color: var(--md-primary-hover);
  text-decoration: none;
}
.markdown-body :deep(a:hover) { text-decoration: underline; }
.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--md-divider);
  padding: 6px 10px;
}
.markdown-body :deep(th) {
  background: var(--md-bg-soft);
  font-weight: 600;
}
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--md-divider);
  margin: 12px 0;
}

/* 打字动画 */
.typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding-left: 4px;
}
.typing .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--md-text-disabled);
  animation: bounce 1.4s infinite ease-in-out both;
}
.typing .dot:nth-child(1) { animation-delay: -0.32s; }
.typing .dot:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* 正在思考 spinner */
.msg-thinking-placeholder {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--md-text-secondary);
  font-size: 14px;
}
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--md-divider);
  border-top-color: var(--md-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.msg-meta { margin-top: 4px; }
.intent-tag {
  font-family: var(--md-font-body);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--md-radius-full);
  background: var(--md-primary-bg);
  color: var(--md-primary-hover);
}

.msg-sources {
  margin-top: 8px;
  max-width: 75%;
  font-size: 12px;
}
.msg-sources summary {
  cursor: pointer;
  color: var(--md-text-secondary);
  padding: 4px 0;
}
.source-item {
  background: var(--md-bg-soft);
  border-left: 3px solid var(--md-border);
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: var(--md-radius-sm);
}
.source-head {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}
.source-name { font-weight: 600; color: var(--md-text); }
.source-time { color: var(--md-text-disabled); font-size: 11px; }
.source-text { color: var(--md-text-secondary); line-height: 1.5; }

.input-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px;
  background: var(--md-bg-card);
  border-top: 1px solid var(--md-border);
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}
.input-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.input-row input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius);
  font-family: var(--md-font-body);
  font-size: 14px;
  color: var(--md-text);
  background: var(--md-bg-soft);
  outline: none;
  transition: border-color 0.2s var(--md-ease-out);
}
.input-row input:focus { border-color: var(--md-primary); }
.input-area button {
  padding: 10px 24px;
  background: var(--md-primary);
  color: var(--md-text-on-primary);
  border: none;
  border-radius: var(--md-radius);
  font-family: var(--md-font-body);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s var(--md-ease-out);
}
.input-area button:hover:not(:disabled) { background: var(--md-primary-hover); }
.input-area button:disabled { background: var(--md-text-disabled); cursor: not-allowed; }

/* 图片按钮（多模态一期）：次级样式，与主发送按钮区分 */
.img-btn {
  padding: 10px 14px !important;
  background: var(--md-bg-soft) !important;
  border: 1px solid var(--md-border) !important;
  color: var(--md-text) !important;
}
.img-btn:hover:not(:disabled) { background: var(--md-bg-hover, var(--md-bg-card)) !important; }

/* 待发送图片预览条 */
.pending-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pending-img {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: var(--md-radius);
  overflow: hidden;
  border: 1px solid var(--md-border);
}
.pending-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pending-img-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  padding: 0 !important;
  border-radius: 0 0 0 var(--md-radius);
  background: rgba(0, 0, 0, 0.55) !important;
  color: #fff !important;
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  cursor: pointer;
}

/* 消息气泡内用户图片缩略图 */
.msg-images {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.msg-image-thumb {
  max-width: 160px;
  max-height: 120px;
  border-radius: 6px;
  object-fit: cover;
  cursor: default;
}
.input-area .stop-btn {
  background: var(--md-danger);
  white-space: nowrap;
}
.input-area .stop-btn:hover { background: #b04a4a; }

/* 复制按钮 */
.copy-btn {
  align-self: flex-start;
  margin-top: 4px;
  padding: 2px 8px;
  background: none;
  border: 1px solid var(--md-divider);
  border-radius: var(--md-radius-sm);
  font-size: 11px;
  color: var(--md-text-disabled);
  cursor: pointer;
  transition: color 0.2s var(--md-ease-out), border-color 0.2s var(--md-ease-out);
}
.copy-btn:hover {
  color: var(--md-text-secondary);
  border-color: var(--md-text-disabled);
}

/* AI 反馈确认卡片 */
.msg-feedback-card {
  align-self: flex-start;
  margin-top: 4px;
  max-width: 75%;
  width: 100%;
}
.feedback-confirm {
  background: var(--md-bg-soft);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-lg);
  padding: 12px 14px;
}
.feedback-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--md-text);
  margin-bottom: 8px;
}
.feedback-card-row {
  font-size: 12px;
  color: var(--md-text-secondary);
  line-height: 1.6;
  margin-bottom: 2px;
}
.feedback-card-row .row-label {
  display: inline-block;
  width: 36px;
  color: var(--md-text-disabled);
  font-weight: 600;
}
.feedback-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.feedback-confirm-btn {
  padding: 5px 14px;
  background: var(--md-primary);
  color: var(--md-text-on-primary);
  border: none;
  border-radius: var(--md-radius);
  font-size: 12px;
  cursor: pointer;
}
.feedback-confirm-btn:hover { background: var(--md-primary-hover); }
.feedback-dismiss-btn {
  padding: 5px 14px;
  background: none;
  color: var(--md-text-secondary);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius);
  font-size: 12px;
  cursor: pointer;
}
.feedback-dismiss-btn:hover { color: var(--md-text); border-color: var(--md-text-disabled); }
.feedback-error {
  margin-top: 6px;
  font-size: 12px;
  color: var(--md-danger);
}
.feedback-submitted {
  padding: 8px 12px;
  background: rgba(138, 154, 91, 0.12);
  border: 1px solid rgba(138, 154, 91, 0.3);
  border-radius: var(--md-radius);
  font-size: 12px;
  color: #5a6b3d;
  display: flex;
  align-items: center;
  gap: 6px;
}
.feedback-link {
  color: var(--md-primary);
  text-decoration: none;
  font-weight: 600;
}
.feedback-link:hover { text-decoration: underline; }

/* 移动端遮罩 */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 10;
}

@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 20;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }
  .chat-header {
    padding: 10px 14px;
  }
}
</style>
