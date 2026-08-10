<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { listSessions, getSession, deleteSession } from '../api/chat'
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

// Agent 图标和标签映射
const agentIcons = {
  main: '🧠',
  person_stat: '📊',
  person_messages: '💬',
  mentioned: '🔍',
  topic_search: '🔎',
  router: '🧭',
}
const agentLabels = {
  main: '男德通（主 Agent）',
  person_stat: '人物统计 Agent',
  person_messages: '人物发言 Agent',
  mentioned: '被提及 Agent',
  topic_search: '话题检索 Agent',
  router: '路由分析',
}
const phaseLabels = {
  planning: '规划',
  analyzing: '分析',
  searching: '检索',
  reasoning: '推理',
  analysis: '综合分析',
  done: '完成',
}
const sidebarOpen = ref(window.innerWidth > 768)
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)

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

  try {
    const res = await getSession(id)
    const turns = res.data?.turns || []
    for (const t of turns) {
      messages.value.push({
        role: t.role === 'assistant' ? 'bot' : 'user',
        content: t.content,
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

async function ask(q) {
  const text = (q || question.value).trim()
  if (!text || loading.value) return

  messages.value.push({ role: 'user', content: text })

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
      body: JSON.stringify({ question: text, sessionId: currentSessionId.value }),
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
                    </div>
                    <div v-for="(step, si) in steps" :key="si" class="agent-step">
                      <span v-if="step.phase" class="step-phase">{{ phaseLabels[step.phase] || step.phase }}</span>
                      <span v-if="step.content" class="step-content">{{ step.content }}</span>
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
          <input
            v-model="question"
            @keydown="handleEnter"
            placeholder="输入问题，回车提问..."
            :disabled="loading"
          />
          <button v-if="loading" class="stop-btn" @click="stopGeneration">
            ⏹ 停止
          </button>
          <button v-else @click="ask()" :disabled="!question.trim()">
            发送
          </button>
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
  background: var(--md-bg);
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
.agent-count {
  font-size: 11px;
  color: var(--md-text-disabled);
  font-weight: normal;
  margin-left: 4px;
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
  gap: 8px;
  padding: 16px 20px;
  background: var(--md-bg-card);
  border-top: 1px solid var(--md-border);
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}
.input-area input {
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
.input-area input:focus { border-color: var(--md-primary); }
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
}
</style>
