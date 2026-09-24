<script setup>
/**
 * 诺诺·自习室（R-058 v4.1.0 直播间形态，admin 灰度）
 *
 * 院长 2026-09-24 裁决：做成类似直播间的文字互动——所有人共享同一条公共消息流，
 * 无私人会话/会话列表。诺诺在流里回复（EventSource 实时广播，所有在线者看到她逐字说话）。
 * 记忆面板为开发阶段可视化工具（开放给普通用户时移除，院长裁决红线）。
 */
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getNonoMessages, sendNonoMessage, getNonoMemories, deleteNonoMemory } from '../api/nono'
import { useDialogStore } from '../stores/dialog'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const dialog = useDialogStore()
const auth = useAuthStore()

// 消息流（公共）：{ id, role: 'user'|'nono', nickname, content, streaming? }
const messages = ref([])
const input = ref('')
const sending = ref(false)
const chatArea = ref(null)
const nonoTyping = ref(false)

// 记忆面板
const memoryPanelOpen = ref(false)
const memoryProfile = ref('')
const memoryList = ref([])
const memoryLoading = ref(false)

// 座位区状态
const nonoStatuses = ['正在看书', '托腮发呆中', '在小本子上写写画画', '翻了一页书', '喝了口麦茶']
const nonoStatus = ref(nonoStatuses[0])
let statusTimer = null

let es = null // EventSource

function scrollBottom(smooth = false) {
  nextTick(() => {
    if (chatArea.value) {
      chatArea.value.scrollTo({ top: chatArea.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    }
  })
}

/** 把诺诺回复解析为段落：{ type: 'action'|'text', text }——（动作）斜体渲染 */
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

// ========== 直播流订阅 ==========
function connectStream() {
  const token = localStorage.getItem('token')
  es = new EventSource(`/api/nono/stream?token=${encodeURIComponent(token || '')}`)

  es.addEventListener('user_message', (e) => {
    const d = JSON.parse(e.data)
    messages.value.push({ id: d.id, role: 'user', nickname: d.nickname, content: d.content })
    scrollBottom(true)
  })

  es.addEventListener('nono_typing', () => {
    nonoTyping.value = true
    // 占位气泡：逐字填充
    messages.value.push({ id: `nono-live-${Date.now()}`, role: 'nono', nickname: '诺诺', content: '', streaming: true })
    scrollBottom(true)
  })

  es.addEventListener('nono_token', (e) => {
    const d = JSON.parse(e.data)
    const live = [...messages.value].reverse().find((m) => m.streaming)
    if (live) live.content += d.content
    scrollBottom()
  })

  es.addEventListener('nono_message', (e) => {
    const d = JSON.parse(e.data)
    nonoTyping.value = false
    // 流式占位替换为正式消息（中途加入的订阅者只有最终条）
    const idx = messages.value.findIndex((m) => m.streaming)
    const finalMsg = { id: d.id, role: 'nono', nickname: '诺诺', content: d.content, memoriesSaved: d.memoriesSaved }
    if (idx >= 0) messages.value.splice(idx, 1, finalMsg)
    else messages.value.push(finalMsg)
    // 她刚说完话，随机换个座位区状态
    nonoStatus.value = nonoStatuses[Math.floor(Math.random() * nonoStatuses.length)]
    scrollBottom(true)
  })
}

// ========== 历史消息 ==========
async function loadHistory() {
  try {
    const res = await getNonoMessages()
    messages.value = res.data.messages || []
    scrollBottom()
  } catch (err) {
    dialog.alert(err?.message || '消息加载失败')
  }
}

// ========== 发送 ==========
async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return
  sending.value = true
  input.value = ''
  try {
    await sendNonoMessage(text)
    // 消息由 EventSource 广播回来统一渲染（不自加，防重复）
  } catch (err) {
    dialog.alert(err?.message || '发送失败')
    input.value = text
  } finally {
    sending.value = false
  }
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
  loadHistory()
  connectStream()
  statusTimer = setInterval(() => {
    nonoStatus.value = nonoStatuses[Math.floor(Math.random() * nonoStatuses.length)]
  }, 45000)
})

onUnmounted(() => {
  es?.close()
  if (statusTimer) clearInterval(statusTimer)
})
</script>

<template>
  <div class="studyroom-page">
    <!-- 诺诺座位区（形象占位：黑机建模完成后替换为 3D 形象位） -->
    <header class="nono-seat">
      <button class="back-btn" title="回大厅" @click="router.push('/home')">←</button>
      <div class="seat-scene">
        <div class="nono-avatar" :class="{ talking: nonoTyping }">📖</div>
        <div class="seat-info">
          <div class="nono-name">诺诺 <span class="nono-tag">自习室</span></div>
          <div class="nono-status">{{ nonoTyping ? '正在回复…' : nonoStatus + '…' }}</div>
        </div>
      </div>
      <div class="seat-actions">
        <span class="viewer-count" title="直播流消息数">{{ messages.length }} 条</span>
        <button class="seat-btn" @click="openMemoryPanel">📚 她记得</button>
      </div>
    </header>

    <!-- 公共消息流（直播间聊天区） -->
    <section class="chat-area" ref="chatArea">
      <div v-if="!messages.length" class="chat-welcome">
        <div class="welcome-avatar">📖</div>
        <p class="welcome-line">（听到脚步声，抬起头）</p>
        <p class="welcome-line subtle">自习室很安静。想说话直接打在下面——大家共用的聊天流。</p>
      </div>

      <div v-for="msg in messages" :key="msg.id" class="msg-row" :class="msg.role">
        <template v-if="msg.role === 'nono'">
          <div class="msg-avatar">📖</div>
          <div class="msg-body">
            <div class="msg-name">诺诺</div>
            <div class="msg-bubble nono">
              <template v-if="msg.content">
                <span v-for="(seg, j) in parseSegments(msg.content)" :key="j">
                  <em v-if="seg.type === 'action'" class="action-seg">{{ seg.text }}</em>
                  <template v-else>{{ seg.text }}</template>
                </span>
                <span v-if="msg.memoriesSaved" class="memory-hint">✦ 记住了</span>
              </template>
              <span v-else class="typing">…</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="msg-body user-side">
            <div class="msg-name me">{{ msg.nickname }}</div>
            <div class="msg-bubble user">{{ msg.content }}</div>
          </div>
        </template>
      </div>
    </section>

    <!-- 输入区 -->
    <footer class="input-bar">
      <input
        v-model="input"
        class="message-input"
        type="text"
        placeholder="在自习室说句话…（大家都能看到，诺诺也会回应）"
        maxlength="500"
        @keydown.enter.prevent="send"
      />
      <button class="send-btn" :disabled="!input.trim() || sending" @click="send">发送</button>
    </footer>

    <!-- 记忆面板（抽屉，开发阶段可视化工具） -->
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
.nono-avatar.talking { animation: talk-pulse 1.6s infinite; }
@keyframes talk-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
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
.seat-actions { display: flex; gap: 8px; align-items: center; }
.viewer-count {
  font-size: 11px;
  color: var(--md-text-secondary, #8a7d78);
  white-space: nowrap;
}
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
.seat-btn:hover { background: var(--md-border); }

/* ===== 公共消息流 ===== */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 18px 16px;
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
  margin-bottom: 12px;
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
  margin-top: 16px;
}
.msg-body { max-width: 72%; }
.msg-name {
  font-size: 11px;
  color: var(--md-text-secondary, #8a7d78);
  margin-bottom: 3px;
}
.msg-name.me { text-align: right; }
.msg-bubble {
  padding: 8px 12px;
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
@keyframes blink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }

/* ===== 输入区 ===== */
.input-bar {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--md-border);
  background: var(--md-bg-card);
  flex-shrink: 0;
}
.message-input {
  flex: 1;
  border: 1px solid var(--md-border);
  border-radius: 10px;
  background: var(--md-bg);
  color: var(--md-text);
  padding: 10px 14px;
  font-size: 14px;
  outline: none;
}
.message-input:focus { border-color: var(--md-text-secondary, #8a7d78); }
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

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .msg-body { max-width: 85%; }
  .seat-btn { padding: 6px 8px; }
}
</style>
