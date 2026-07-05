<script setup>
import { ref, nextTick } from 'vue'
import { askChat } from '../api/chat'

const messages = ref([])
const question = ref('')
const loading = ref(false)
const chatArea = ref(null)
const currentSessionId = ref(null)

const suggestions = [
  '群里发言最多的人是谁',
  '大家讨论过打球吗',
  '饶志锐发了多少条消息',
  '2024年群里有较多消息的月份有哪些',
]

async function ask(q) {
  const text = (q || question.value).trim()
  if (!text || loading.value) return

  messages.value.push({ role: 'user', content: text })
  question.value = ''
  loading.value = true
  await scrollBottom()

  try {
    const res = await askChat(text, currentSessionId.value)
    currentSessionId.value = res.data.sessionId
    messages.value.push({
      role: 'bot',
      content: res.data.answer,
      intent: res.data.intent,
      sources: res.data.sources || [],
    })
  } catch (err) {
    messages.value.push({
      role: 'bot',
      content: err.message || '出错了，请重试',
      error: true,
    })
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
</script>

<template>
  <div class="chat-page">
    <div class="chat-header">
      <router-link to="/home" class="back-link">← 返回</router-link>
      <h2>男德通</h2>
      <span class="hint">基于 51 万条群聊数据</span>
    </div>

    <div class="chat-area" ref="chatArea">
      <div v-if="messages.length === 0" class="empty">
        <div class="empty-icon">💬</div>
        <p class="empty-title">向 AI 助手提问吧</p>
        <div class="suggestions">
          <button v-for="s in suggestions" :key="s" @click="ask(s)">{{ s }}</button>
        </div>
      </div>

      <div v-for="(msg, i) in messages" :key="i" :class="['msg', msg.role]">
        <div class="msg-bubble" :class="{ error: msg.error }">
          {{ msg.content }}
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

      <div v-if="loading" class="msg bot">
        <div class="msg-bubble loading-bubble">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
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
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  background: #f5f5f5;
}

.chat-header {
  padding: 16px 20px;
  background: #1a1a2e;
  color: #fff;
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.chat-header h2 { font-size: 18px; font-weight: 600; margin-right: auto; }
.chat-header .hint { font-size: 12px; color: #888; }
.back-link { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 13px; }
.back-link:hover { color: #fff; }

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
}
.msg.user { align-items: flex-end; }
.msg.bot { align-items: flex-start; }

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

.loading-bubble {
  display: flex;
  gap: 4px;
  align-items: center;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: bounce 1.4s infinite ease-in-out both;
}
.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

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
</style>
