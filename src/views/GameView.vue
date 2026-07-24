<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { createGame, destroyGame, pauseGame, resumeGame, disableKeyboard, enableKeyboard, sendChatMessage as sendMsg, sendNpcReply, closeChat as closeChatFn } from '../../game/main.js'
import { on as gameOn, off as gameOff } from '../../game/events.js'
import { WORLD_WIDTH, WORLD_HEIGHT, GROUND, TOWER, NPC_POSITIONS, ITEM_POSITIONS, DOOR_POSITION, PORTAL_POSITION } from '../../game/mapData.js'
import { NPCS } from '../../shared/npcs.js'

const router = useRouter()
const auth = useAuthStore()

const gameContainer = ref(null)
const showNpcDialog = ref(false)
const npcId = ref('')
const showItemDialog = ref(false)
const itemId = ref('')
const showPortalDialog = ref(false)

// 角色面板弹窗（博德之门风格：立绘 + 装备栏 + 背包 + 属性面板）
const showCharPanel = ref(false)
const activeEquipSlot = ref(null)  // 当前选中的装备槽（点击卸下），null=无选中
const activeSkillSlot = ref(null)  // 当前选中的技能槽，null=无选中

// 装备占位数据（R-012 接入后端后替换）
const equipment = reactive({
  head: null,    // 头盔 { name, icon, def, res }
  chest: null,   // 胸甲 { name, icon, def, hp }
  legs: null,    // 护腿 { name, icon, def, speed }
  boots: null,   // 靴子 { name, icon, res, speed }
  weapon: null,  // 武器 { name, icon, atk, type }
})

// 基础属性（德塔剧情加护：DEF 5 / RES 3）
const baseStats = reactive({
  hp: 100,
  mp: 200,
  atk: 10,
  def: 5,
  res: 3,
})

// NPC 对话
const npcConfig = ref(null)           // 当前交互的 NPC 配置（从 shared/npcs.js 匹配）
const npcMessages = ref([])           // 对话消息列表
const npcInput = ref('')             // 输入框
const npcInputRef = ref(null)        // 输入框 ref
const npcMessagesRef = ref(null)     // 消息列表 ref
const npcThinking = ref(false)       // AI 思考中（控制输入框禁用）
const npcSessionId = ref(null)       // NPC 对话会话 ID（跨多轮对话复用）

// 聊天
const chatOpen = ref(false)
const chatInput = ref('')
const chatMessages = ref([])
const chatInputRef = ref(null)
const chatMessagesRef = ref(null)

/** 格式化时间戳：2026/7/15 17:30:30 */
function formatTime() {
  const d = new Date()
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

/** 收到聊天消息（来自服务器广播，包括自己） */
function onChatReceived(data) {
  const time = formatTime()
  chatMessages.value.push({ sender: data.nickname, text: data.text, time })
  scrollChatBottom()
}

// 角色信息
const nickname = ref(auth.user?.nickname || auth.user?.username || '学员')

// 玩家形象（skinId 1-5）：HUD 头像 / 立绘 URL
const skinId = ref(auth.skinId || '1')
const avatarUrl = computed(() => `/game/sprites/avatars/player_set${skinId.value}.png`)
const portraitUrl = computed(() => `/game/portraits/player_set${skinId.value}.png`)

/** 打开角色面板（查看立绘+装备+背包） */
function openCharPanel() {
  showCharPanel.value = true
  pauseGame()
}

/** 关闭角色面板 */
function closeCharPanel() {
  showCharPanel.value = false
  resumeGame()
}

/** 切换玩家形象（1-5） */
function switchSkin(id) {
  const newId = String(id)
  if (newId === skinId.value) return
  auth.setSkinId(newId)
  skinId.value = newId
  // 本会话内仅更新 HUD；下次进入德塔（重连 Colyseus）时精灵表才会切换
  // 因为 Phaser 纹理在 PreloadScene 加载后不易热替换，建议玩家主动重进德塔
  console.log('[GameView] 切换形象:', newId, '（重进德塔生效）')
}

/** 头像加载失败 → 用占位图（避免 broken image） */
function onAvatarError(e) {
  e.target.src = '/game/sprites/avatars/player_set1.png'
}

/** 立绘加载失败 → 用占位立绘 */
function onPortraitError(e) {
  e.target.src = '/game/portraits/player_set1.png'
}

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
  skinId.value = auth.skinId || '1'
  createGame('game-container', token, name, skinId.value)

  gameOn('npc-interact', onNpcInteract)
  gameOn('item-interact', onItemInteract)
  gameOn('portal-interact', onPortalInteract)
  gameOn('chat-open', onChatOpen)
  gameOn('chat-received', onChatReceived)
  gameOn('player-position', onPlayerPosition)
  gameOn('game-ready', onGameReady)
})

onUnmounted(() => {
  destroyGame()
  gameOff('npc-interact', null)
  gameOff('item-interact', null)
  gameOff('portal-interact', null)
  gameOff('chat-open', null)
  gameOff('chat-received', null)
  gameOff('player-position', null)
  gameOff('game-ready', null)
})

function onNpcInteract(data) {
  npcId.value = data.npcId
  // 从配置中找到对应 NPC
  const found = NPCS.find(n => n.id === data.npcId)
  npcConfig.value = found || { id: data.npcId, name: data.npcId, portraitKey: `portrait_${data.npcId}` }
  npcMessages.value = [{ role: 'assistant', text: `欢迎来到德塔！我是${npcConfig.value.name}，有什么想问的尽管问~` }]
  npcInput.value = ''
  npcThinking.value = false
  npcSessionId.value = null  // 每次打开重置会话
  showNpcDialog.value = true
  pauseGame()
  nextTick(() => npcInputRef.value?.focus())
}
function onItemInteract(data) {
  itemId.value = data.itemId
  showItemDialog.value = true
  pauseGame()
}
function onPortalInteract() {
  showPortalDialog.value = true
  pauseGame()
}
function confirmLeavePortal() {
  showPortalDialog.value = false
  resumeGame()
  router.push('/home')
}
function cancelLeavePortal() {
  showPortalDialog.value = false
  resumeGame()
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
  npcThinking.value = false
  resumeGame()
}
function closeItemDialog() {
  showItemDialog.value = false
  resumeGame()
}

// === NPC 对话 ===
function handleNpcKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendNpcMessage()
  } else if (e.key === 'Escape') {
    closeNpcDialog()
  }
}

function sendNpcMessage() {
  const text = npcInput.value.trim()
  if (!text || npcThinking.value) return

  // 用户消息
  npcMessages.value.push({ role: 'user', text })
  npcInput.value = ''
  scrollNpcMessages()
  npcThinking.value = true

  // 预先创建 AI 消息占位（流式累加）
  const aiMsg = reactive({ role: 'assistant', text: '' })
  npcMessages.value.push(aiMsg)
  scrollNpcMessages()

  streamNpcReply(text, aiMsg)
}

/**
 * SSE 流式调 NPC 接口，逐字累加到 aiMsg
 */
async function streamNpcReply(question, aiMsg) {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/chat/npc/talk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        npcId: 'nandetong_game',
        question,
        sessionId: npcSessionId.value || undefined,
      }),
    })

    if (!response.ok) {
      aiMsg.text = `请求失败 (${response.status})`
      npcThinking.value = false
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let firstToken = true

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
            firstToken = false
            aiMsg.text += data.content
            scrollNpcMessages()
          } else if (eventType === 'done') {
            npcSessionId.value = data.sessionId
            // 广播给其他玩家（NPC 头顶气泡 + 全服聊天框）
            if (aiMsg.text) {
              sendNpcReply(nickname.value, data.npcId || 'nandetong', aiMsg.text)
            }
          } else if (eventType === 'error') {
            aiMsg.text = data.message || '出错了'
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    // 如果一个 token 都没收到（API 额度错误等），保留占位提示
    if (firstToken && !aiMsg.text) {
      aiMsg.text = '男德通暂时没回应，稍后再试~'
    }
  } catch (err) {
    aiMsg.text = err.message?.includes('fetch') || err.message?.includes('network')
      ? '网络错误，请检查连接'
      : (err.message || '未知错误')
  } finally {
    npcThinking.value = false
  }
}

function scrollNpcMessages() {
  nextTick(() => {
    const el = npcMessagesRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

// === 聊天 ===
function handleChatSend() {
  const text = chatInput.value.trim()
  if (!text || text.length > 100) {
    if (text.length > 100) {
      chatMessages.value.push({ sender: '系统', text: '消息不能超过 100 字', system: true, time: formatTime() })
      scrollChatBottom()
    }
    return
  }
  // 发送到服务器，服务器广播后由 onChatReceived 统一添加时间戳
  sendMsg(nickname.value, text)
  chatInput.value = ''
  closeChat()
}

function handleChatKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    const text = chatInput.value.trim()
    if (text) {
      handleChatSend()
    } else {
      closeChat()
    }
    return
  }
  if (e.key === 'Escape' || e.key === 'Tab') {
    e.preventDefault()
    closeChat()
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

  // 传送门点
  ctx.fillStyle = PORTAL_POSITION.color
  const py_pt = toMiniY(PORTAL_POSITION.y + yOffset)
  ctx.fillRect(PORTAL_POSITION.x * ratioX - 2, py_pt - 2, 4, 4)

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
        <div class="char-avatar" @click="openCharPanel" :title="`点击查看角色面板`">
          <img :src="avatarUrl" :alt="`形象 ${skinId}`" @error="onAvatarError" />
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

      <!-- 2. 装备槽 + 技能槽 -->
      <div class="panel-equip">
        <div class="equip-grid">
          <!-- 装备槽（头盔/胸甲/护腿/靴子） -->
          <div class="equip-slot" :class="{ active: activeEquipSlot === 'head' }" title="头盔">
            <span v-if="!equipment.head" class="slot-empty">头</span>
            <img v-else :src="equipment.head.icon" class="slot-icon" />
          </div>
          <div class="equip-slot" :class="{ active: activeEquipSlot === 'chest' }" title="胸甲">
            <span v-if="!equipment.chest" class="slot-empty">胸</span>
            <img v-else :src="equipment.chest.icon" class="slot-icon" />
          </div>
          <div class="equip-slot" :class="{ active: activeEquipSlot === 'legs' }" title="护腿">
            <span v-if="!equipment.legs" class="slot-empty">腿</span>
            <img v-else :src="equipment.legs.icon" class="slot-icon" />
          </div>
          <div class="equip-slot" :class="{ active: activeEquipSlot === 'boots' }" title="靴子">
            <span v-if="!equipment.boots" class="slot-empty">靴</span>
            <img v-else :src="equipment.boots.icon" class="slot-icon" />
          </div>
          <!-- 技能槽（当前用3个，预留1个） -->
          <div v-for="i in 4" :key="'skill'+i" class="skill-slot" :class="{ active: activeSkillSlot === i }" @click="activeSkillSlot = activeSkillSlot === i ? null : i" :title="`技能位 ${i}`">
            <span v-if="i === 1" class="slot-key">1</span>
            <span v-else-if="i === 2" class="slot-key">2</span>
            <span v-else-if="i === 3" class="slot-key">3</span>
            <span v-else class="slot-key">4</span>
          </div>
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="panel-divider"></div>

      <!-- 3. 背包 -->
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
            <span class="msg-time">{{ msg.time ? '【' + msg.time + '】' : '' }}</span>
            <span v-if="!msg.system" class="msg-sender">{{ msg.sender }}：</span>
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

    <!-- NPC 对话弹窗（立绘 + AI 对话） -->
    <div v-if="showNpcDialog" class="nde-dialog-overlay" @click.self="closeNpcDialog">
      <div class="nde-dialog nde-dialog-npc">
        <div class="nde-dialog-header">
          <span>{{ npcConfig?.name || 'NPC' }}</span>
          <button @click="closeNpcDialog" class="nde-dialog-close">✕</button>
        </div>
        <div class="nde-dialog-body nde-npc-body">
          <!-- 左侧：立绘 -->
          <div class="nde-npc-portrait">
            <img v-if="npcConfig?.portraitKey" :src="`/game/portraits/${npcConfig.portraitKey.replace('portrait_', '')}.png`" :alt="npcConfig?.name" />
            <div v-else class="nde-portrait-placeholder">无立绘</div>
          </div>
          <!-- 右侧：聊天 -->
          <div class="nde-npc-chat">
            <div class="nde-npc-messages" ref="npcMessagesRef">
              <div v-for="(msg, i) in npcMessages" :key="i" class="nde-npc-msg" :class="msg.role">
                <span class="nde-npc-role">{{ msg.role === 'user' ? nickname : (npcConfig?.name || '男德通') }}：</span>
                <span v-if="msg.text" class="nde-npc-text" v-html="msg.text"></span>
                <span v-else class="nde-npc-thinking"><span class="nde-spinner"></span> 正在思考...</span>
              </div>
            </div>
            <div class="nde-npc-input-row">
              <div class="nde-npc-prefix">@ {{ npcConfig?.name || '男德通' }}&nbsp;</div>
              <input
                ref="npcInputRef"
                v-model="npcInput"
                type="text"
                class="nde-npc-input"
                maxlength="100"
                placeholder="输入问题，Enter 发送 · Esc 关闭"
                @keydown="handleNpcKeydown"
                :disabled="npcThinking"
              />
              <button class="nde-btn nde-btn-primary nde-npc-send" @click="sendNpcMessage" :disabled="npcThinking || !npcInput.trim()">发送</button>
            </div>
          </div>
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

    <!-- 传送门弹窗 -->
    <div v-if="showPortalDialog" class="nde-dialog-overlay">
      <div class="nde-dialog">
        <div class="nde-dialog-header">
          <span>传送门</span>
        </div>
        <div class="nde-dialog-body" style="text-align: center;">
          <p>确定要离开德塔吗？</p>
          <div style="display: flex; gap: 16px; justify-content: center; margin-top: 16px;">
            <button @click="confirmLeavePortal" class="nde-btn nde-btn-primary">是</button>
            <button @click="cancelLeavePortal" class="nde-btn nde-btn-secondary">否</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色面板弹窗（博德之门风格：立绘 + 装备栏 + 背包 + 属性） -->
    <div v-if="showCharPanel" class="nde-dialog-overlay" @click.self="closeCharPanel">
      <div class="nde-dialog nde-char-dialog">
        <div class="nde-dialog-header">
          <span>{{ nickname }} · 角色面板</span>
          <button @click="closeCharPanel" class="nde-dialog-close">✕</button>
        </div>
        <div class="nde-char-body">
          <!-- 左侧：立绘 -->
          <div class="nde-char-portrait">
            <img :src="portraitUrl" :alt="`形象 ${skinId} 立绘`" @error="onPortraitError" />
            <div class="nde-char-skin-label">形象 {{ skinId }} / 5</div>
          </div>

          <!-- 中间：装备栏 + 属性面板 -->
          <div class="nde-char-equip">
            <div class="equip-section-title">装备栏</div>
            <div class="equip-panel-grid">
              <div class="equip-panel-slot" :class="{ active: activeEquipSlot === 'weapon' }"
                   @click="activeEquipSlot = activeEquipSlot === 'weapon' ? null : 'weapon'" title="武器">
                <span v-if="!equipment.weapon" class="slot-empty">武</span>
                <img v-else :src="equipment.weapon.icon" class="slot-icon" />
              </div>
              <div class="equip-panel-slot" :class="{ active: activeEquipSlot === 'head' }"
                   @click="activeEquipSlot = activeEquipSlot === 'head' ? null : 'head'" title="头盔">
                <span v-if="!equipment.head" class="slot-empty">头</span>
                <img v-else :src="equipment.head.icon" class="slot-icon" />
              </div>
              <div class="equip-panel-slot" :class="{ active: activeEquipSlot === 'chest' }"
                   @click="activeEquipSlot = activeEquipSlot === 'chest' ? null : 'chest'" title="胸甲">
                <span v-if="!equipment.chest" class="slot-empty">胸</span>
                <img v-else :src="equipment.chest.icon" class="slot-icon" />
              </div>
              <div class="equip-panel-slot" :class="{ active: activeEquipSlot === 'legs' }"
                   @click="activeEquipSlot = activeEquipSlot === 'legs' ? null : 'legs'" title="护腿">
                <span v-if="!equipment.legs" class="slot-empty">腿</span>
                <img v-else :src="equipment.legs.icon" class="slot-icon" />
              </div>
              <div class="equip-panel-slot" :class="{ active: activeEquipSlot === 'boots' }"
                   @click="activeEquipSlot = activeEquipSlot === 'boots' ? null : 'boots'" title="靴子">
                <span v-if="!equipment.boots" class="slot-empty">靴</span>
                <img v-else :src="equipment.boots.icon" class="slot-icon" />
              </div>
            </div>
            <div class="equip-section-title">属性</div>
            <div class="nde-char-stats">
              <div class="stat-row"><span class="stat-label">生命</span><span class="stat-value">{{ baseStats.hp }} / {{ baseStats.hp }}</span></div>
              <div class="stat-row"><span class="stat-label">魔力</span><span class="stat-value">{{ baseStats.mp }} / {{ baseStats.mp }}</span></div>
              <div class="stat-row"><span class="stat-label">攻击</span><span class="stat-value">{{ baseStats.atk }}</span></div>
              <div class="stat-row"><span class="stat-label">护甲</span><span class="stat-value">{{ baseStats.def }}</span></div>
              <div class="stat-row"><span class="stat-label">魔抗</span><span class="stat-value">{{ baseStats.res }}</span></div>
            </div>
          </div>

          <!-- 右侧：背包 -->
          <div class="nde-char-bag">
            <div class="equip-section-title">背包（0 / 8）</div>
            <div class="char-bag-grid">
              <div v-for="i in 8" :key="i" class="char-bag-slot"></div>
            </div>
          </div>
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
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;
  position: relative;
}
.char-avatar:hover {
  border-color: #c9a96e;
  box-shadow: 0 0 8px rgba(201, 169, 110, 0.4);
}
.char-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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

/* ===== 2. 装备槽 + 技能槽 ===== */
.panel-equip {
  width: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #2a2a3a 0%, #1a1a2a 50%, #2a2a3a 100%);
}
.equip-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 3px;
  padding: 6px;
}
.equip-slot, .skill-slot {
  width: 32px;
  height: 32px;
  border: 1px solid #4a4a5a;
  background: linear-gradient(135deg, #1a1a2a, #2a2a3a);
  border-radius: 2px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.equip-slot:hover, .skill-slot:hover {
  border-color: #6b8e6b;
  box-shadow: 0 0 6px rgba(107, 142, 107, 0.4);
}
.equip-slot.active, .skill-slot.active {
  border-color: #c9a96e;
  box-shadow: 0 0 6px rgba(201, 169, 110, 0.5);
}
.slot-empty {
  font-size: 13px;
  color: #5a5a6a;
  font-weight: 600;
}
.slot-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.slot-key {
  font-size: 12px;
  color: #5a5a6a;
  font-weight: 600;
}

/* ===== 3. 背包 ===== */
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

/* ===== 4. 聊天 ===== */
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
.msg-time {
  color: #888;
  font-size: 10px;
  margin-right: 2px;
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

/* 按钮样式 */
.nde-btn {
  padding: 6px 24px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}
.nde-btn:hover { opacity: 0.85; }
.nde-btn-primary {
  background: #6b8e6b;
  color: #fff;
}
.nde-btn-secondary {
  background: #444;
  color: #ccc;
}

/* NPC 对话弹窗（立绘 + 聊天） */
.nde-dialog-npc {
  width: 720px;
  max-width: 95vw;
}
.nde-npc-body {
  display: flex;
  gap: 16px;
  padding: 0;
  min-height: 400px;
}
.nde-npc-portrait {
  flex: 0 0 200px;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.nde-npc-portrait img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.nde-portrait-placeholder {
  color: #555;
  font-size: 14px;
}

/* ===== 角色面板弹窗 ===== */
.nde-char-dialog {
  width: 760px;
  max-width: 94vw;
  max-height: 90vh;
}
.nde-char-body {
  display: flex;
  gap: 12px;
  padding: 12px;
  min-height: 360px;
}
/* 左侧立绘 */
.nde-char-portrait {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a1a22;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}
.nde-char-portrait img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.nde-char-skin-label {
  font-size: 12px;
  color: #c9a96e;
  margin-top: 8px;
  padding: 2px 8px;
  background: rgba(0,0,0,0.4);
  border-radius: 3px;
}
/* 中间装备栏 + 属性 */
.nde-char-equip {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.equip-section-title {
  font-size: 12px;
  color: #c9a96e;
  font-weight: 600;
  padding-bottom: 4px;
  border-bottom: 1px solid #3a3a44;
}
.equip-panel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.equip-panel-slot {
  width: 32px;
  height: 32px;
  border: 1px solid #4a4a5a;
  background: linear-gradient(135deg, #1a1a2a, #2a2a3a);
  border-radius: 2px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.equip-panel-slot:hover {
  border-color: #6b8e6b;
  box-shadow: 0 0 6px rgba(107, 142, 107, 0.4);
}
.equip-panel-slot.active {
  border-color: #c9a96e;
  box-shadow: 0 0 6px rgba(201, 169, 110, 0.5);
}
/* 属性面板 */
.nde-char-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.stat-label {
  color: #999;
}
.stat-value {
  color: #e0d8c0;
  font-weight: 600;
}
/* 右侧背包 */
.nde-char-bag {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.char-bag-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
}
.char-bag-slot {
  width: 32px;
  height: 32px;
  border: 1px solid #5a4a3a;
  background: linear-gradient(135deg, #2a1a0a, #3a2a1a);
  border-radius: 2px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05);
}
.nde-npc-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  min-width: 0;
}
.nde-npc-messages {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
  margin-bottom: 8px;
}
.nde-npc-msg {
  margin-bottom: 8px;
  line-height: 1.5;
  word-break: break-word;
}
.nde-npc-msg.user .nde-npc-role { color: #6b8e6b; }
.nde-npc-msg.assistant .nde-npc-role { color: #FFD700; }
.nde-npc-text {
  color: #ddd;
}
.nde-npc-thinking {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #888;
  font-style: italic;
}
.nde-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #444;
  border-top-color: #FFD700;
  border-radius: 50%;
  animation: nde-spin 0.8s linear infinite;
}
@keyframes nde-spin { to { transform: rotate(360deg); } }
.nde-npc-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1a1a1a;
  border-radius: 4px;
  padding: 0 8px;
}
.nde-npc-prefix {
  color: #6b8e6b;
  font-size: 13px;
  white-space: nowrap;
  user-select: none;
}
.nde-npc-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #ddd;
  font-size: 13px;
  padding: 8px 0;
  outline: none;
}
.nde-npc-send {
  flex-shrink: 0;
  padding: 4px 12px;
  font-size: 12px;
}
</style>