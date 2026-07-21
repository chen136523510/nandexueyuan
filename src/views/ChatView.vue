<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { listSessions, getSession, deleteSession } from '../api/chat'

const messages = ref([])
const question = ref('')
const loading = ref(false)
const chatArea = ref(null)
const currentSessionId = ref(null)
const sessions = ref([])

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
const sidebarOpen = ref(true)

const suggestions = [
  '群里发言最多的人是谁',
  '大家讨论过打球吗',
  '群里谁喷人最多',
  '饶志锐发了多少条消息',
]

onMounted(() => {
  loadSessions()
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
  if (!confirm('确定删除这个会话？')) return
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
    const response = await fetch('/api/chat/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ question: text, sessionId: currentSessionId.value }),
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
    botMsg.content = err.message || '网络错误，请重试'
    botMsg.error = true
  }

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
      <button class="toggle-btn" @click="sidebarOpen = !sidebarOpen">☰</button>
    </div>

    <div class="chat-body">
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
            <button class="delete-btn" @click="deleteChat(s.id, $event)" title="删除">×</button>
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
              <template v-if="msg.content">{{ msg.content }}</template>
              <div v-else-if="loading && msg.role === 'bot'" class="msg-thinking-placeholder">
                <span class="spinner"></span> 正在思考...
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
          <input
            v-model="question"
            @keydown="handleEnter"
            placeholder="输入问题，回车提问..."
            :disabled="loading"
          />
          <button @click="ask()" :disabled="loading || !question.trim()">
            {{ loading ? '...' : '发送' }}
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
  background: #f5f5f5;
}

.chat-header {
  padding: 12px 20px;
  background: #1a1a2e;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
}
.chat-header h2 { font-size: 18px; font-weight: 600; margin-right: auto; }
.back-link { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 13px; }
.back-link:hover { color: #fff; }
.toggle-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

.chat-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}
.new-chat-btn {
  margin: 12px;
  padding: 10px;
  background: #1677ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
.new-chat-btn:hover { background: #4096ff; }
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}
.session-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: background 0.2s;
}
.session-item:hover { background: #f5f5f5; }
.session-item.active { background: #e6f4ff; }
.session-info { flex: 1; min-width: 0; }
.session-title {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-meta { font-size: 11px; color: #999; margin-top: 2px; }
.delete-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.delete-btn:hover { color: #ff4d4f; }
.no-sessions {
  text-align: center;
  color: #999;
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
.empty-title { font-size: 16px; color: #666; margin-bottom: 24px; }
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
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 20px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
}
.suggestions button:hover {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1677ff;
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
  color: #999;
  padding: 4px 8px;
  user-select: none;
}
.msg-thinking summary:hover { color: #666; }
.thinking-content {
  background: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #888;
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
  background: #f8f9fa;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 8px 12px;
}
.msg-agent-thinking summary {
  cursor: pointer;
  font-size: 13px;
  color: #666;
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
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
}
.agent-router { background: #f0f5ff; border-left: 3px solid #1677ff; }
.agent-statistic, .agent-person_stat { background: #fff7e6; border-left: 3px solid #fa8c16; }
.agent-semantic, .agent-mentioned { background: #f6ffed; border-left: 3px solid #52c41a; }
.agent-topic_search { background: #e6fffb; border-left: 3px solid #13c2c2; }
.agent-person_messages { background: #fff0f6; border-left: 3px solid #eb2f96; }
.agent-main { background: #f9f0ff; border-left: 3px solid #722ed1; }
.agent-label {
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 4px;
  opacity: 0.9;
}
.agent-step {
  color: #555;
  margin-bottom: 2px;
}
.step-content {
  display: block;
  word-break: break-word;
}
.step-phase {
  display: inline-block;
  font-size: 10px;
  color: #999;
  background: rgba(0,0,0,0.05);
  padding: 1px 4px;
  border-radius: 3px;
  margin-right: 4px;
}
.agent-count {
  font-size: 11px;
  color: #999;
  font-weight: normal;
  margin-left: 4px;
}
.data-key {
  font-weight: 600;
  color: #555;
}
.step-sql {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #d46b08;
  background: rgba(250, 140, 22, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 2px;
}
.step-data {
  margin-top: 4px;
  padding-left: 8px;
  border-left: 2px solid rgba(0,0,0,0.08);
}
.data-row {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #666;
  padding: 1px 0;
}
.msg-row {
  font-size: 11px;
  padding: 2px 0;
  color: #555;
}
.msg-row-name {
  font-weight: 600;
  color: #389e0d;
  margin-right: 6px;
}
.msg-row-text {
  color: #666;
}
.data-more {
  font-size: 11px;
  color: #999;
  font-style: italic;
}

.msg-bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.user .msg-bubble {
  background: #1677ff;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.msg.bot .msg-bubble {
  background: #fff;
  color: #333;
  border: 1px solid #e8e8e8;
  border-bottom-left-radius: 4px;
}
.msg-bubble.error { background: #fff2f0; border-color: #ffccc7; color: #cf1322; }

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
  background: #999;
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
  color: var(--md-text-secondary, #8A8A8A);
  font-size: 14px;
}
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #e8e8e8;
  border-top-color: var(--md-primary, #A8C5A0);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.msg-meta { margin-top: 4px; }
.intent-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #e6f4ff;
  color: #1677ff;
}

.msg-sources {
  margin-top: 8px;
  max-width: 75%;
  font-size: 12px;
}
.msg-sources summary {
  cursor: pointer;
  color: #888;
  padding: 4px 0;
}
.source-item {
  background: #fafafa;
  border-left: 3px solid #d9d9d9;
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 4px;
}
.source-head {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}
.source-name { font-weight: 600; color: #333; }
.source-time { color: #999; font-size: 11px; }
.source-text { color: #666; line-height: 1.5; }

.input-area {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}
.input-area input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}
.input-area input:focus { border-color: #1677ff; }
.input-area button {
  padding: 10px 24px;
  background: #1677ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}
.input-area button:hover:not(:disabled) { background: #4096ff; }
.input-area button:disabled { background: #bbb; cursor: not-allowed; }

@media (max-width: 768px) {
  .sidebar { width: 200px; }
}
</style>
