<script setup>
/**
 * 诺诺·自习室（R-058 一期 agent 形态，admin 灰度）
 *
 * 体验定位：类似男德通的对话交互，但主角是「诺诺」——安静温柔的自习室常驻少女。
 * 本期核心是实践三层记忆与大脑架构：
 *   - 回复内（动作）标记渲染为高亮斜体（3D 阶段映射为 VRM 动作库）
 *   - done 事件携带 memoriesSaved，「她记住了」可感知
 *   - 记忆面板：诺诺眼中的你 + 她记住的事（可删）
 */
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listNonoSessions, getNonoSession, deleteNonoSession, getNonoMemories, deleteNonoMemory } from '../api/nono'
import { useDialogStore } from '../stores/dialog'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const dialog = useDialogStore()
const auth = useAuthStore()

const messages = ref([])
const question = ref('')
const loading = ref(false)
const chatArea = ref(null)
const currentSessionId = ref(null)
const sessions = ref([])
const abortController = ref(null)
const sidebarOpen = ref(true)

// 记忆面板
const memoryPanelOpen = ref(false)
const memoryProfile = ref('')
const memoryList = ref([])
const memoryLoading = ref(false)

// 诺诺状态文案（占位形象阶段的"活人感"由状态语随机给出）
const nonoStatuses = ['正在看书', '托腮发呆中', '在小本子上写写画画', '翻了一页书', '喝了口麦茶']
const nonoStatus = ref(nonoStatuses[0])
let statusTimer = null

function rotateStatus() {
  statusTimer = setInterval(() => {
    nonoStatus.value = nonoStatuses[Math.floor(Math.random() * nonoStatuses.length)]
  }, 45000)
}

/** 把回复解析为段落数组：{ type: 'action'|'text', text } ——（动作）整段或行内混合 */
function parseSegments(content) {
  const segs = []
  const re = /（[^（）]{1,40}）|\([^()]{1,40}\)/g
  let last = 0
  let m
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) segs.push({ type: 'text', text: content.slice(last, m.index) })
    segs.push({ type: 'action', text: m[0].slice(1, -1) })
    last = m.index + m[0].length
  }
  if (last < content.length) segs.push({ type: 'text', text: content.slice(last) })
  return segs
}

function scrollBottom() {
  nextTick(() => {
    if (chatArea.value) chatArea.value.scrollTop = chatArea.value.scrollHeight
  })
}

async function loadSessions() {
  try {
    const res = await listNonoSessions()
    sessions.value = res.data || []
  } catch { /* 静默 */ }
}

function stripPrefix(title) {
  return (title || '').replace(/^\[自习室\]\s*/, '')
}

async function openSession(id) {
  if (loading.value) return
  try {
    const res = await getNonoSession(id)
    const s = res.data
    currentSessionId.value = s.id
    messages.value = s.turns.map((t) => ({ role: t.role, content: t.content }))
    scrollBottom()
  } catch (err) {
    dialog.alert(err?.message || '会话加载失败')
  }
}

function newSession() {
  if (loading.value) return
  currentSessionId.value = null
  messages.value = []
}

async function removeSession(id) {
  const ok = await dialog.confirm('删除这段自习室对话？诺诺不会忘记和你聊过的记忆。')
  if (!ok) return
  try {
    await deleteNonoSession(id)
    if (currentSessionId.value === id) newSession()
    await loadSessions()
  } catch (err) {
    dialog.alert(err?.message || '删除失败')
  }
}

async function send() {
  const text = question.value.trim()
  if (!text || loading.value) return

  question.value = ''
  loading.value = true
  messages.value.push({ role: 'user', content: text })
  const botMsg = { role: 'assistant', content: '' }
  messages.value.push(botMsg)
  scrollBottom()

  try {
    const token = localStorage.getItem('token')
    abortController.value = new AbortController()
    const response = await fetch('/api/nono/talk', {
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
          if (eventType === 'token') {
            botMsg.content += data.content
            scrollBottom()
          } else if (eventType === 'done') {
            if (data.sessionId) currentSessionId.value = data.sessionId
            if (data.memoriesSaved > 0) {
              botMsg.memoriesSaved = data.memoriesSaved
            }
            await loadSessions()
          } else if (eventType === 'error') {
            botMsg.content = botMsg.content || data.message
            botMsg.error = true
          }
        } catch { /* 忽略解析错误 */ }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      botMsg.content += '\n（已打断）'
    } else {
      botMsg.content = botMsg.content || '连接出了点问题，稍后再试试'
      botMsg.error = true
    }
  } finally {
    loading.value = false
    abortController.value = null
    scrollBottom()
  }
}

function stopGenerate() {
  abortController.value?.abort()
}

// ========== 记忆面板 ==========
async function openMemoryPanel() {
  memoryPanelOpen.value = true
  memoryLoading.value = true
  try {
    const res = await getNonoMemories()
    memoryProfile.value = res.data.profile || ''
    memoryList.value = res.data.memories || []
  } catch (err) {
    dialog.alert(err?.message || '记忆加载失败')
  } finally {
    memoryLoading.value = false
  }
}

async function removeMemory(id) {
  const ok = await dialog.confirm('让诺诺忘掉这条记忆？')
  if (!ok) return
  try {
    await deleteNonoMemory(id)
    memoryList.value = memoryList.value.filter((m) => m.id !== id)
  } catch (err) {
    dialog.alert(err?.message || '删除失败')
  }
}

const kindLabels = { fact: '事实', event: '事件', preference: '偏好' }

onMounted(() => {
  loadSessions()
  rotateStatus()
})
</script>

<template>
  <div class="studyroom-page">
    <!-- 诺诺座位区（形象占位：黑机建模完成后替换为 3D 形象位） -->
    <header class="nono-seat">
      <button class="back-btn" title="回大厅" @click="router.push('/home')">←</button>
      <div class="seat-scene">
        <div class="nono-avatar">📖</div>
        <div class="seat-info">
          <div class="nono-name">诺诺 <span class="nono-tag">自习室</span></div>
          <div class="nono-status">{{ nonoStatus }}<span class="status-ellipsis">…</span></div>
        </div>
      </div>
      <div class="seat-actions">
        <button class="seat-btn" @click="openMemoryPanel">📚 她记得</button>
        <button class="seat-btn" :class="{ active: sidebarOpen }" @click="sidebarOpen = !sidebarOpen">☰</button>
      </div>
    </header>

    <div class="studyroom-body">
      <!-- 会话侧栏 -->
      <aside v-show="sidebarOpen" class="session-panel">
        <button class="new-session-btn" @click="newSession">＋ 新的闲聊</button>
        <div class="session-list">
          <div
            v-for="s in sessions"
            :key="s.id"
            class="session-item"
            :class="{ active: s.id === currentSessionId }"
            @click="openSession(s.id)"
          >
            <div class="session-title">{{ stripPrefix(s.title) || '一段闲聊' }}</div>
            <div class="session-meta">{{ s._count?.turns || 0 }} 条 · {{ new Date(s.updatedAt).toLocaleDateString() }}</div>
            <button class="session-del" title="删除" @click.stop="removeSession(s.id)">✕</button>
          </div>
          <div v-if="!sessions.length" class="session-empty">还没有和诺诺聊过天</div>
        </div>
      </aside>

      <!-- 对话区 -->
      <section class="chat-area" ref="chatArea">
        <div v-if="!messages.length" class="chat-welcome">
          <div class="welcome-avatar">📖</div>
          <p class="welcome-line">（听到脚步声，抬起头）</p>
          <p class="welcome-line subtle">你来了呀。想聊天的话，直接说就好——我记得住重要的事。</p>
        </div>

        <div v-for="(msg, i) in messages" :key="i" class="msg-row" :class="msg.role">
          <template v-if="msg.role === 'assistant'">
            <div class="msg-avatar">📖</div>
            <div class="msg-bubble nono">
              <template v-if="msg.content">
                <span v-for="(seg, j) in parseSegments(msg.content)" :key="j">
                  <em v-if="seg.type === 'action'" class="action-seg">{{ seg.text }}</em>
                  <template v-else>{{ seg.text }}</template>
                </span>
                <span v-if="msg.memoriesSaved" class="memory-hint">✦ 记住了</span>
              </template>
              <span v-else class="typing">…</span>
              <div v-if="msg.error" class="msg-error">↻ 出错了</div>
            </div>
          </template>
          <template v-else>
            <div class="msg-bubble user">{{ msg.content }}</div>
          </template>
        </div>
      </section>
    </div>

    <!-- 输入区 -->
    <footer class="input-bar">
      <input
        v-model="question"
        class="question-input"
        type="text"
        placeholder="和诺诺说点什么…（她正在自习，话不多但记得住）"
        maxlength="500"
        :disabled="loading"
        @keydown.enter.prevent="send"
      />
      <button v-if="loading" class="send-btn stop" @click="stopGenerate">打断</button>
      <button v-else class="send-btn" :disabled="!question.trim()" @click="send">发送</button>
    </footer>

    <!-- 记忆面板（抽屉） -->
    <transition name="drawer">
      <div v-if="memoryPanelOpen" class="memory-mask" @click.self="memoryPanelOpen = false">
        <div class="memory-panel">
          <div class="memory-header">
            <span>📚 诺诺记得的事</span>
            <button class="memory-close" @click="memoryPanelOpen = false">✕</button>
          </div>

          <div class="memory-profile">
            <div class="profile-title">她眼中的{{ auth.displayName || '你' }}</div>
            <p v-if="memoryProfile">{{ memoryProfile }}</p>
            <p v-else class="profile-empty">（还没怎么记住你——多聊几句吧）</p>
          </div>

          <div class="memory-list">
            <div v-if="memoryLoading" class="memory-empty">正在翻她的记忆本…</div>
            <div v-else-if="!memoryList.length" class="memory-empty">记忆本是空的</div>
            <div v-for="m in memoryList" :key="m.id" class="memory-item">
              <div class="memory-content">
                <span class="memory-kind" :class="m.kind">{{ kindLabels[m.kind] || m.kind }}</span>
                <span v-if="m.shared" class="memory-shared">公共</span>
                {{ m.content }}
              </div>
              <div class="memory-foot">
                <span class="memory-importance" :title="`重要度 ${m.importance}/10`">✦ {{ m.importance }}</span>
                <span class="memory-date">{{ new Date(m.createdAt).toLocaleDateString() }}</span>
                <button class="memory-del" @click="removeMemory(m.id)">忘记</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.studyroom-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--md-bg);
  color: var(--md-text);
  overflow: hidden;
}

/* ===== 诺诺座位区 ===== */
.nono-seat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--md-bg-card);
  border-bottom: 1px solid var(--md-border);
  flex-shrink: 0;
}
.back-btn {
  border: 1px solid var(--md-border);
  background: transparent;
  color: var(--md-text);
  border-radius: 8px;
  width: 34px;
  height: 34px;
  cursor: pointer;
  font-size: 16px;
}
.back-btn:hover { background: var(--md-border); }
.seat-scene {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.nono-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d8ccc8, #c5b9b4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border: 2px solid var(--md-border);
  flex-shrink: 0;
}
.seat-info { min-width: 0; }
.nono-name {
  font-family: var(--md-font-display);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.nono-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(160, 140, 130, 0.18);
  color: var(--md-text-secondary, #8a7d78);
  font-weight: 400;
}
.nono-status {
  font-size: 12px;
  color: var(--md-text-secondary, #8a7d78);
}
.status-ellipsis { animation: blink 2s infinite; }
@keyframes blink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
.seat-actions { display: flex; gap: 8px; }
.seat-btn {
  border: 1px solid var(--md-border);
  background: transparent;
  color: var(--md-text);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}
.seat-btn:hover, .seat-btn.active { background: var(--md-border); }

/* ===== 主体 ===== */
.studyroom-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.session-panel {
  width: 220px;
  border-right: 1px solid var(--md-border);
  background: var(--md-bg-card);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.new-session-btn {
  margin: 10px;
  padding: 8px;
  border: 1px dashed var(--md-border);
  border-radius: 8px;
  background: transparent;
  color: var(--md-text);
  cursor: pointer;
}
.new-session-btn:hover { background: var(--md-border); }
.session-list { flex: 1; overflow-y: auto; padding: 0 10px 10px; }
.session-item {
  position: relative;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
}
.session-item:hover { background: var(--md-border); }
.session-item.active { background: rgba(160, 140, 130, 0.22); }
.session-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 18px;
}
.session-meta { font-size: 11px; color: var(--md-text-secondary, #8a7d78); margin-top: 2px; }
.session-del {
  position: absolute;
  right: 6px;
  top: 8px;
  border: none;
  background: transparent;
  color: var(--md-text-secondary, #8a7d78);
  cursor: pointer;
  font-size: 11px;
  opacity: 0;
}
.session-item:hover .session-del { opacity: 1; }
.session-empty {
  text-align: center;
  font-size: 12px;
  color: var(--md-text-secondary, #8a7d78);
  padding: 20px 0;
}

/* ===== 对话区 ===== */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 18px;
}
.chat-welcome {
  text-align: center;
  padding: 60px 0 30px;
}
.welcome-avatar {
  font-size: 44px;
  margin-bottom: 12px;
  opacity: 0.85;
}
.welcome-line { margin: 4px 0; font-size: 14px; }
.welcome-line.subtle { color: var(--md-text-secondary, #8a7d78); font-size: 13px; }

.msg-row {
  display: flex;
  margin-bottom: 14px;
  gap: 8px;
}
.msg-row.user { justify-content: flex-end; }
.msg-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d8ccc8, #c5b9b4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.msg-bubble {
  max-width: 72%;
  padding: 9px 13px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg-bubble.nono {
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-top-left-radius: 4px;
}
.msg-bubble.user {
  background: rgba(160, 140, 130, 0.28);
  border-top-right-radius: 4px;
}
.action-seg {
  color: var(--md-text-secondary, #8a7d78);
  font-style: italic;
  font-size: 13px;
}
.memory-hint {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  color: #a8875f;
}
.typing { color: var(--md-text-secondary, #8a7d78); animation: blink 1.2s infinite; }
.msg-error { margin-top: 4px; font-size: 12px; color: #c07a6a; }

/* ===== 输入区 ===== */
.input-bar {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--md-border);
  background: var(--md-bg-card);
  flex-shrink: 0;
}
.question-input {
  flex: 1;
  border: 1px solid var(--md-border);
  border-radius: 10px;
  background: var(--md-bg);
  color: var(--md-text);
  padding: 10px 14px;
  font-size: 14px;
  outline: none;
}
.question-input:focus { border-color: var(--md-text-secondary, #8a7d78); }
.send-btn {
  border: none;
  border-radius: 10px;
  background: rgba(160, 140, 130, 0.75);
  color: #fff;
  padding: 0 22px;
  cursor: pointer;
  font-size: 14px;
}
.send-btn:disabled { opacity: 0.4; cursor: default; }
.send-btn.stop { background: #b0756a; }

/* ===== 记忆抽屉 ===== */
.memory-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 50;
  display: flex;
  justify-content: flex-end;
}
.memory-panel {
  width: 380px;
  max-width: 92vw;
  height: 100%;
  background: var(--md-bg);
  border-left: 1px solid var(--md-border);
  display: flex;
  flex-direction: column;
}
.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--md-border);
  font-family: var(--md-font-display);
  font-weight: 600;
}
.memory-close {
  border: none;
  background: transparent;
  color: var(--md-text);
  cursor: pointer;
  font-size: 14px;
}
.memory-profile {
  margin: 12px 16px;
  padding: 12px 14px;
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.7;
}
.profile-title {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--md-text-secondary, #8a7d78);
}
.profile-empty { color: var(--md-text-secondary, #8a7d78); }
.memory-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}
.memory-empty {
  text-align: center;
  font-size: 13px;
  color: var(--md-text-secondary, #8a7d78);
  padding: 24px 0;
}
.memory-item {
  padding: 10px 12px;
  border: 1px solid var(--md-border);
  border-radius: 10px;
  margin-bottom: 8px;
  background: var(--md-bg-card);
}
.memory-content { font-size: 13px; line-height: 1.6; }
.memory-kind {
  display: inline-block;
  font-size: 11px;
  padding: 0 6px;
  border-radius: 4px;
  margin-right: 6px;
  background: rgba(160, 140, 130, 0.2);
  color: var(--md-text-secondary, #8a7d78);
}
.memory-kind.event { background: rgba(168, 135, 95, 0.25); }
.memory-kind.preference { background: rgba(140, 160, 150, 0.25); }
.memory-shared {
  font-size: 11px;
  color: var(--md-text-secondary, #8a7d78);
  margin-right: 6px;
}
.memory-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--md-text-secondary, #8a7d78);
}
.memory-del {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #c07a6a;
  cursor: pointer;
  font-size: 11px;
}
.drawer-enter-active, .drawer-leave-active { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(100%); }
.drawer-enter-active .memory-panel, .drawer-leave-active .memory-panel { transition: none; }

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .session-panel {
    position: absolute;
    left: 0;
    top: 57px;
    bottom: 62px;
    z-index: 10;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.15);
  }
  .msg-bubble { max-width: 85%; }
  .seat-btn.book-btn { display: none; }
}
</style>
