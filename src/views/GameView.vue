<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { createGame, destroyGame, pauseGame, resumeGame, disableKeyboard, enableKeyboard, sendChatMessage as sendMsg, closeChat as closeChatFn } from '../../game/main.js'
import { on as gameOn, off as gameOff } from '../../game/events.js'
import { WORLD_WIDTH, WORLD_HEIGHT, GROUND, TOWER, NPC_POSITIONS, ITEM_POSITIONS, DOOR_POSITION } from '../../game/mapData.js'

const router = useRouter()
const auth = useAuthStore()

const gameContainer = ref(null)
const showNpcDialog = ref(false)
const npcId = ref('')
const showItemDialog = ref(false)
const itemId = ref('')

// 聊天
const chatOpen = ref(false)
const chatInput = ref('')
const chatMessages = ref([])
const chatInputRef = ref(null)
const chatMessagesRef = ref(null)

// 角色信息
const nickname = ref(auth.user?.nickname || auth.user?.username || '学员')

// 小地图
const minimapCanvas = ref(null)
const playerPos = ref({ x: 520, y: 600, groundY: 636 })

onMounted(async () => {
  if (!auth.isLoggedIn) {
    router.push('/')
    return
  }

  if (!auth.user) {
    await auth.fetchMe()
  }

  const token = auth.token
  const name = auth.user?.nickname || auth.user?.username || '学员'
  nickname.value = name
  createGame('game-container', token, name)

  gameOn('npc-interact', onNpcInteract)
  gameOn('item-interact', onItemInteract)
  gameOn('chat-open', onChatOpen)
  gameOn('player-position', onPlayerPosition)
  gameOn('game-ready', onGameReady)
})

onUnmounted(() => {
  destroyGame()
  gameOff('npc-interact', null)
  gameOff('item-interact', null)
  gameOff('chat-open', null)
  gameOff('player-position', null)
  gameOff('game-ready', null)
})

function onNpcInteract(data) {
  npcId.value = data.npcId
  showNpcDialog.value = true
  pauseGame()
}
function onItemInteract(data) {
  itemId.value = data.itemId
  showItemDialog.value = true
  pauseGame()
}
function onChatOpen() {
  chatOpen.value = true
  disableKeyboard()
  nextTick(() => chatInputRef.value?.focus())
}
function onPlayerPosition(pos) {
  playerPos.value = pos
  drawMinimap()
}
function onGameReady() {
  drawMinimap()
}

function closeNpcDialog() {
  showNpcDialog.value = false
  resumeGame()
}
function closeItemDialog() {
  showItemDialog.value = false
  resumeGame()
}

// === 聊天 ===
function handleChatSend() {
  const text = chatInput.value.trim()
  if (!text || text.length > 100) {
    if (text.length > 100) {
      chatMessages.value.push({ sender: '系统', text: '消息不能超过 100 字', system: true })
      scrollChatBottom()
    }
    return
  }
  chatMessages.value.push({ sender: nickname.value, text })
  sendMsg(nickname.value, text)
  chatInput.value = ''
  scrollChatBottom()
  closeChat()  // 发送后关闭
}

function handleChatKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleChatSend()
    return
  }
  if (e.key === 'Escape' || e.key === 'Tab') {
    e.preventDefault()
    handleChatSend()  // 退出时也发送内容
  }
}

function closeChat() {
  chatOpen.value = false
  chatInput.value = ''
  closeChatFn()
  enableKeyboard()
  gameContainer.value?.querySelector('canvas')?.focus()
}

function scrollChatBottom() {
  nextTick(() => {
    const el = chatMessagesRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

// === 小地图 ===
function drawMinimap() {
  const canvas = minimapCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  const ratioX = w / WORLD_WIDTH

  // 地面实际 Y（来自 Phaser，取决于浏览器高度）
  const actualGroundY = playerPos.value.groundY || GROUND.y
  // 静态偏移量（mapData 中的坐标基于 GROUND.y=636，需对实际值做偏移）
  const yOffset = actualGroundY - GROUND.y

  // 垂直范围：塔顶 → 地面底，固定 640px（塔 576 + 地面 64）
  const TOWER_TOTAL_H = 640
  const ratioY = h / TOWER_TOTAL_H
  // 世界坐标 → 小地图 Y 坐标
  const toMiniY = (worldY) => (worldY - (actualGroundY - 576)) * ratioY

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, w, h)

  // 地面线
  const gy = toMiniY(actualGroundY)
  ctx.strokeStyle = '#4CAF50'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, gy)
  ctx.lineTo(w, gy)
  ctx.stroke()

  // 塔楼
  const tx = TOWER.x * ratioX
  const tw = TOWER.width * ratioX
  const th = TOWER.floors * TOWER.floorHeight * ratioY
  ctx.fillStyle = 'rgba(128,128,128,0.3)'
  ctx.fillRect(tx, gy - th, tw, th)
  ctx.strokeStyle = '#808080'
  ctx.strokeRect(tx, gy - th, tw, th)

  // 楼层线
  for (let f = 1; f < TOWER.floors; f++) {
    const fy = gy - f * TOWER.floorHeight * ratioY
    ctx.strokeStyle = '#8B4513'
    ctx.beginPath()
    ctx.moveTo(tx + 4, fy)
    ctx.lineTo(tx + tw - 4, fy)
    ctx.stroke()
  }

  // NPC 点
  for (const npc of NPC_POSITIONS) {
    ctx.fillStyle = npc.color
    const ny = toMiniY(npc.y + yOffset)
    ctx.fillRect(npc.x * ratioX - 2, ny - 2, 4, 4)
  }
  // 物品点
  for (const item of ITEM_POSITIONS) {
    ctx.fillStyle = item.color
    const iy = toMiniY(item.y + yOffset)
    ctx.fillRect(item.x * ratioX - 2, iy - 2, 4, 4)
  }
  // 大门点
  ctx.fillStyle = DOOR_POSITION.color
  const dy = toMiniY(DOOR_POSITION.y + yOffset)
  ctx.fillRect(DOOR_POSITION.x * ratioX - 2, dy - 2, 4, 4)

  // 玩家位置
  const px = playerPos.value.x * ratioX
  const py = toMiniY(playerPos.value.y)
  ctx.fillStyle = '#2196F3'
  ctx.beginPath()
  ctx.arc(px, py, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  ctx.stroke()
}
</script>

<template>
  <div class="nde-page">
    <!-- 顶部导航 -->
    <div class="nde-topbar">
      <router-link to="/home" class="nde-back">← 返回学院</router-link>
      <span class="nde-title">德塔 / NDO</span>
    </div>

    <!-- 游戏画布 -->
    <div ref="gameContainer" id="game-container" class="nde-canvas"></div>

    <!-- 暗面：四模块 -->
    <div class="nde-panel">
      <!-- 1. 角色信息 -->
      <div class="panel-char">
        <div class="char-avatar">
          <canvas width="40" height="40" class="avatar-canvas"></canvas>
        </div>
        <div class="char-info">
          <div class="char-name">{{ nickname }}</div>
          <div class="char-bars">
            <div class="bar-row">
              <span class="bar-label">HP</span>
              <div class="bar-track"><div class="bar-fill hp-fill" :style="{ width: '100%' }"></div></div>
            </div>
            <div class="bar-row">
              <span class="bar-label">MP</span>
              <div class="bar-track"><div class="bar-fill mp-fill" :style="{ width: '100%' }"></div></div>
            </div>
          </div>
          <div class="char-buffs">
            <span class="buff-slot"></span>
            <span class="buff-slot"></span>
            <span class="buff-slot"></span>
          </div>
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="panel-divider"></div>

      <!-- 2. 背包 -->
      <div class="panel-bag">
        <div class="bag-grid">
          <div v-for="i in 8" :key="i" class="bag-slot"></div>
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="panel-divider"></div>

      <!-- 3. 聊天 -->
      <div class="panel-chat">
        <div class="chat-messages" ref="chatMessagesRef">
          <div v-for="(msg, i) in chatMessages" :key="i" class="chat-msg" :class="{ system: msg.system }">
            <span v-if="!msg.system" class="msg-sender">{{ msg.sender }}:</span>
            <span class="msg-text">{{ msg.text }}</span>
          </div>
        </div>
        <div v-if="chatOpen" class="chat-input-row">
          <input
            ref="chatInputRef"
            v-model="chatInput"
            type="text"
            class="chat-input"
            maxlength="100"
            placeholder="Enter 发送 · Esc/Tab 关闭"
            @keydown="handleChatKeydown"
          />
          <span class="chat-count">{{ chatInput.length }}/100</span>
        </div>
        <div v-else class="chat-hint">
          按 <kbd>Enter</kbd> 聊天
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="panel-divider"></div>

      <!-- 4. 小地图 -->
      <div class="panel-minimap">
        <canvas ref="minimapCanvas" width="130" height="90" class="minimap-canvas"></canvas>
      </div>
    </div>

    <!-- NPC 对话弹窗 -->
    <div v-if="showNpcDialog" class="nde-dialog-overlay" @click.self="closeNpcDialog">
      <div class="nde-dialog">
        <div class="nde-dialog-header">
          <span>NPC 交互</span>
          <button @click="closeNpcDialog" class="nde-dialog-close">✕</button>
        </div>
        <div class="nde-dialog-body">
          <p>与 <strong>{{ npcId }}</strong> 的交互界面（开发中）</p>
          <p class="nde-hint">后续将接入 AI 对话功能</p>
        </div>
      </div>
    </div>

    <!-- 物品弹窗 -->
    <div v-if="showItemDialog" class="nde-dialog-overlay" @click.self="closeItemDialog">
      <div class="nde-dialog">
        <div class="nde-dialog-header">
          <span>物品查看</span>
          <button @click="closeItemDialog" class="nde-dialog-close">✕</button>
        </div>
        <div class="nde-dialog-body">
          <p>与 <strong>{{ itemId }}</strong> 的交互界面（开发中）</p>
          <p class="nde-hint">后续将接入公告功能</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nde-page {
  position: fixed;
  inset: 0;
  background: #0a0a14;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.nde-topbar {
  height: 32px;
  background: #0d0d1a;
  border-bottom: 1px solid #1a1a2e;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 16px;
  z-index: 10;
  flex-shrink: 0;
}
.nde-back {
  color: #6b8e6b;
  text-decoration: none;
  font-size: 12px;
}
.nde-back:hover { color: #8fbc8f; }
.nde-title {
  color: #555;
  font-size: 12px;
}

/* 游戏画布 */
.nde-canvas {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.nde-canvas :deep(canvas) {
  display: block;
}

/* ===== 暗面 ===== */
.nde-panel {
  height: 120px;
  background: linear-gradient(180deg, #1a1a24 0%, #111118 100%);
  border-top: 2px solid #2a2a3a;
  display: flex;
  flex-shrink: 0;
  overflow: hidden;
}

/* 模块分隔线 */
.panel-divider {
  width: 2px;
  background: linear-gradient(180deg, transparent 10%, #4a4a5a 30%, #4a4a5a 70%, transparent 90%);
  flex-shrink: 0;
}

/* ===== 1. 角色信息 ===== */
.panel-char {
  width: 180px;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  gap: 10px;
  flex-shrink: 0;
  background: #2a2a32;
}
.char-avatar {
  width: 44px;
  height: 44px;
  border: 2px solid #444;
  border-radius: 3px;
  background: #1a1a22;
  flex-shrink: 0;
}
.char-info {
  flex: 1;
  min-width: 0;
}
.char-name {
  font-size: 13px;
  color: #e0d8c0;
  font-weight: 600;
  margin-bottom: 4px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.char-bars {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.bar-label {
  font-size: 9px;
  color: #999;
  width: 18px;
  text-align: right;
  font-weight: 700;
}
.bar-track {
  flex: 1;
  height: 7px;
  background: #111;
  border-radius: 2px;
  border: 1px solid #333;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 1px;
}
.hp-fill { background: linear-gradient(90deg, #c62828, #e53935); }
.mp-fill { background: linear-gradient(90deg, #1565c0, #1e88e5); }

.char-buffs {
  display: flex;
  gap: 4px;
  margin-top: 5px;
}
.buff-slot {
  width: 16px;
  height: 16px;
  border: 1px solid #444;
  border-radius: 2px;
  background: #1a1a22;
}

/* ===== 2. 背包 ===== */
.panel-bag {
  width: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #3a2a1a 0%, #2a1a0a 50%, #3a2a1a 100%);
}
.bag-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 3px;
  padding: 6px;
}
.bag-slot {
  width: 32px;
  height: 32px;
  border: 1px solid #5a4a3a;
  background: linear-gradient(135deg, #2a1a0a, #3a2a1a);
  border-radius: 2px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05);
}

/* ===== 3. 聊天 ===== */
.panel-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 6px 10px;
  min-width: 0;
  background: #2a2a36;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  font-size: 12px;
  margin-bottom: 4px;
  scrollbar-width: thin;
  scrollbar-color: #444 #222;
}
.chat-messages::-webkit-scrollbar {
  width: 4px;
}
.chat-messages::-webkit-scrollbar-track {
  background: #222;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 2px;
}
.chat-msg {
  padding: 1px 0;
  word-break: break-all;
}
.chat-msg.system {
  color: #e53935;
  font-style: italic;
  font-size: 11px;
}
.msg-sender {
  color: #6b8e6b;
  font-weight: 600;
  margin-right: 4px;
}
.msg-text {
  color: #eee;
}
.chat-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chat-input {
  flex: 1;
  background: #3a3a46;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 12px;
  color: #eee;
  outline: none;
}
.chat-input:focus {
  border-color: #8fbc8f;
}
.chat-count {
  font-size: 10px;
  color: #777;
  flex-shrink: 0;
}
.chat-hint {
  font-size: 11px;
  color: #666;
  text-align: center;
  padding: 4px;
}
.chat-hint kbd {
  background: #3a3a46;
  border: 1px solid #555;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  color: #aaa;
}

/* ===== 4. 小地图 ===== */
.panel-minimap {
  width: 146px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #1a1a24;
}
.minimap-canvas {
  border: 2px solid #5a4a3a;
  border-radius: 3px;
  image-rendering: pixelated;
  box-shadow: 0 0 8px rgba(0,0,0,0.4), inset 0 0 4px rgba(0,0,0,0.3);
}

/* 弹窗 */
.nde-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.nde-dialog {
  background: #1a1a2e;
  border: 1px solid #6b8e6b;
  border-radius: 10px;
  min-width: 300px;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}
.nde-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a3e;
  color: #fff;
  font-size: 14px;
}
.nde-dialog-close {
  background: none;
  border: none;
  color: #666;
  font-size: 16px;
  cursor: pointer;
}
.nde-dialog-close:hover { color: #fff; }
.nde-dialog-body {
  padding: 16px;
  color: #ccc;
  font-size: 14px;
}
.nde-hint {
  color: #666;
  font-size: 12px;
  margin-top: 8px;
}
</style>