<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useVisualNovelStore } from '../visualnovel/stores/visualNovelStore.js'
import BackgroundLayer from '../visualnovel/components/BackgroundLayer.vue'
import CharacterLayer from '../visualnovel/components/CharacterLayer.vue'
import DialogueBox from '../visualnovel/components/DialogueBox.vue'
import ChoiceMenu from '../visualnovel/components/ChoiceMenu.vue'
import QuickMenu from '../visualnovel/components/QuickMenu.vue'
import SaveLoadPanel from '../visualnovel/components/SaveLoadPanel.vue'
import HistoryPanel from '../visualnovel/components/HistoryPanel.vue'
import SettingsPanel from '../visualnovel/components/SettingsPanel.vue'
import InventoryPanel from '../visualnovel/components/InventoryPanel.vue'
import TopBar from '../components/TopBar.vue'

const store = useVisualNovelStore()
const showStartScreen = ref(true)

// 开始游戏
function startGame() {
  showStartScreen.value = false
  store.initGame()
}

// 滚轮回滚/重做（防抖 120ms）
let wheelLock = false
function handleWheel(e) {
  // 面板打开/输入框/开始界面时不响应
  if (store.activePanel || store.triggeredCG) return
  if (store.currentNode?.type === 'input') return
  if (wheelLock) return
  wheelLock = true
  setTimeout(() => { wheelLock = false }, 120)
  if (e.deltaY < 0) {
    store.rollback()   // 上滚 = 回退
  } else {
    store.forward()    // 下滚 = 前进
  }
}

// ===== 快捷键绑定 =====
function handleKeydown(e) {
  // 面板打开时，只有 Esc 关闭面板
  if (store.activePanel) {
    if (e.key === 'Escape') {
      store.closePanel()
    }
    return
  }

  // CG 展示时，任意键关闭
  if (store.triggeredCG) {
    store.closeCG()
    return
  }

  // input 节点时，不响应空格/Enter推进（输入框自行处理 Enter）
  const isInputNode = store.currentNode?.type === 'input'
  if (isInputNode && (e.key === ' ' || e.key === 'Enter')) {
    return
  }

  switch (e.key) {
    case ' ':
    case 'Enter':
      e.preventDefault()
      store.advance()
      break
    case 'b':
    case 'B':
      store.togglePanel('inventory')
      break
    case 'h':
    case 'H':
      store.toggleHideUI()
      break
    case 's':
    case 'S':
      store.togglePanel('save')
      break
    case 'Escape':
      store.togglePanel('settings')
      break
  }
}

// 鼠标右键打开设置
function handleContextmenu(e) {
  e.preventDefault()
  if (!store.activePanel && !store.triggeredCG) {
    store.togglePanel('settings')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('contextmenu', handleContextmenu)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('contextmenu', handleContextmenu)
  // 清理打字机定时器
  store.stopTypewriter()
})
</script>

<template>
  <div class="visualnovel-page">
    <TopBar />

    <!-- 开始界面 -->
    <div v-if="showStartScreen" class="start-screen">
      <div class="start-content">
        <h1 class="start-title">德塔</h1>
        <p class="start-subtitle">A.V.118 — 虚空降临的第118年</p>
        <p class="start-desc">三年前，男德学院降临大草原，塔楼拔地而起，裂隙开始消散。<br>如今，第二批漂泊者到来。风暴才刚刚开始。</p>
        <button class="start-btn" @click="startGame">
          开始故事
        </button>
      </div>
    </div>

    <!-- 游戏主界面 -->
    <div v-else class="game-stage" :class="{ 'hide-ui': store.hideUI }" @wheel.prevent="handleWheel">
      <!-- 背景层 -->
      <BackgroundLayer />

      <!-- 立绘层 -->
      <CharacterLayer />

      <!-- 对话框 -->
      <DialogueBox />

      <!-- 选项菜单 -->
      <ChoiceMenu />

      <!-- 快捷栏 -->
      <QuickMenu />

      <!-- 面板层 -->
      <SaveLoadPanel />
      <HistoryPanel />
      <SettingsPanel />
      <InventoryPanel />

      <!-- 加载中遮罩 -->
      <div v-if="store.isLoading" class="loading-overlay">
        <span class="loading-text">载入中…</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.visualnovel-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0d1117;
}

/* 开始界面 */
.start-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #1a2332 0%, #0d1117 100%);
}

.start-content {
  text-align: center;
  padding: 40px;
}

.start-title {
  font-size: 48px;
  font-weight: 700;
  color: #e8e0cc;
  letter-spacing: 12px;
  margin: 0 0 16px;
  text-shadow: 0 2px 20px rgba(201, 169, 110, 0.3);
}

.start-subtitle {
  color: rgba(201, 169, 110, 0.7);
  font-size: 16px;
  letter-spacing: 2px;
  margin: 0 0 8px;
}

.start-desc {
  color: #8b95a8;
  font-size: 14px;
  line-height: 1.8;
  margin: 0 0 40px;
  max-width: 400px;
}

.start-btn {
  padding: 14px 48px;
  background: linear-gradient(135deg, rgba(201, 169, 110, 0.2) 0%, rgba(201, 169, 110, 0.1) 100%);
  color: rgba(201, 169, 110, 0.9);
  border: 1px solid rgba(201, 169, 110, 0.3);
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 4px;
}

.start-btn:hover {
  background: linear-gradient(135deg, rgba(201, 169, 110, 0.3) 0%, rgba(201, 169, 110, 0.15) 100%);
  border-color: rgba(201, 169, 110, 0.5);
  box-shadow: 0 4px 20px rgba(201, 169, 110, 0.2);
}

/* 游戏舞台 */
.game-stage {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #0d1117;
  user-select: none;
}

/* 加载遮罩 */
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  color: rgba(201, 169, 110, 0.6);
  font-size: 18px;
  letter-spacing: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
</style>
