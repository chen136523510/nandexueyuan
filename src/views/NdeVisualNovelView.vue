<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useVisualNovelStore } from '../visualnovel/stores/visualNovelStore.js'
import { NodeType } from '../visualnovel/engine/types.js'
import BackgroundLayer from '../visualnovel/components/BackgroundLayer.vue'
import CharacterLayer from '../visualnovel/components/CharacterLayer.vue'
import HotspotLayer from '../visualnovel/components/HotspotLayer.vue'
import NoticePopup from '../visualnovel/components/NoticePopup.vue'
import DialogueBox from '../visualnovel/components/DialogueBox.vue'
import ChoiceMenu from '../visualnovel/components/ChoiceMenu.vue'
import QuickMenu from '../visualnovel/components/QuickMenu.vue'
import SaveLoadPanel from '../visualnovel/components/SaveLoadPanel.vue'
import HistoryPanel from '../visualnovel/components/HistoryPanel.vue'
import SettingsPanel from '../visualnovel/components/SettingsPanel.vue'
import InventoryPanel from '../visualnovel/components/InventoryPanel.vue'
import MapPanel from '../visualnovel/components/MapPanel.vue'
import TopBar from '../components/TopBar.vue'

const store = useVisualNovelStore()

// 全窗口点击推进对话（原神/视觉小说标准交互）
// 排除：菜单按钮、面板、选项、输入框、热点、CG、提示弹窗
function handleStageClick(e) {
  // 面板打开时不推进
  if (store.activePanel) return
  // CG 展示时不推进（由 closeCG 处理）
  if (store.triggeredCG) return
  // 提示弹窗时不推进
  if (store.noticeMessage) return
  // 点击了带 data-no-advance 标记的元素（菜单按钮等），不推进
  if (e.target.closest('[data-no-advance]')) return
  // choice 节点不推进（等用户选）
  if (store.currentNode?.type === NodeType.CHOICE) return
  // input 节点不推进（等用户输入）
  if (store.currentNode?.type === NodeType.INPUT) return
  // 自由探索模式（热点）不推进
  if (store.isEnded) return
  // 探索态（R-035 空间机制）不推进（等热点/出口交互）
  if (store.isExploring) return

  store.advance()
}

// ===== 主菜单按钮处理 =====
async function handleContinue() {
  await store.continueGame()
}

async function handleNewGame() {
  const result = await store.startNewGame()
  if (!result.success && result.reason === 'full') {
    store.showNotice('存档已满，请先在存档列表中删除旧存档')
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

  // 主菜单时不响应游戏快捷键
  if (store.gamePhase === 'menu') return

  // CG 展示时，任意键关闭
  if (store.triggeredCG) {
    store.closeCG()
    return
  }

  // 轻提示弹窗时，任意键关闭
  if (store.noticeMessage) {
    store.closeNotice()
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
  if (!store.activePanel && !store.triggeredCG && store.gamePhase === 'playing') {
    store.togglePanel('settings')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('contextmenu', handleContextmenu)
  // 检查是否有存档（控制"继续游戏"按钮禁用态）
  store.checkHasSave()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('contextmenu', handleContextmenu)
  // 清理打字机定时器
  store.stopTypewriter()
  // 离开页面时自动存档
  store.autoSave()
})
</script>

<template>
  <div class="visualnovel-page">
    <TopBar />

    <!-- 主菜单 -->
    <div v-if="store.gamePhase === 'menu'" class="main-menu">
      <div class="menu-content">
        <h1 class="menu-title">德塔</h1>
        <p class="menu-subtitle">A.V.118 — 虚空降临的第118年</p>
        <p class="menu-desc">三年前，男德学院降临大草原，塔楼拔地而起，裂隙开始消散。<br>如今，第二批漂泊者到来。风暴才刚刚开始。</p>
        <div class="menu-buttons">
          <button
            class="menu-btn primary"
            :disabled="!store.hasSave || store.isLoading"
            data-testid="vn-menu-continue-btn"
            @click="handleContinue"
          >
            继续游戏
          </button>
          <button
            class="menu-btn"
            :disabled="store.isLoading"
            data-testid="vn-menu-newgame-btn"
            @click="handleNewGame"
          >
            新游戏
          </button>
          <button
            class="menu-btn"
            :disabled="store.isLoading"
            data-testid="vn-menu-loadlist-btn"
            @click="store.togglePanel('load')"
          >
            存档列表
          </button>
          <button
            class="menu-btn"
            data-testid="vn-menu-settings-btn"
            @click="store.togglePanel('settings')"
          >
            设置
          </button>
        </div>
      </div>
    </div>

    <!-- 游戏主界面 -->
    <div v-else class="game-stage" :class="{ 'hide-ui': store.hideUI }" @click="handleStageClick">
      <!-- 背景层 -->
      <BackgroundLayer />

      <!-- 立绘层 -->
      <CharacterLayer />

      <!-- 热点交互层（序章结束后/探索态自由探索） -->
      <HotspotLayer />

      <!-- 探索态地点描述横幅（R-035：有对话时对话框正常显示，探索态空闲显示地点描述） -->
      <div v-if="store.isExploring && store.currentNode?.desc" class="explore-desc" data-no-advance>
        {{ store.currentNode.desc }}
      </div>

      <!-- 对话框 -->
      <DialogueBox />

      <!-- 选项菜单 -->
      <ChoiceMenu />

      <!-- 快捷栏 -->
      <QuickMenu />
    </div>

    <!-- 面板层（menu 和 playing 都可显示，移到顶层避免被 game-stage overflow 裁切） -->
    <SaveLoadPanel />
    <HistoryPanel />
    <SettingsPanel />
    <InventoryPanel />
    <MapPanel />

    <!-- 轻提示弹窗（敬请期待等） -->
    <NoticePopup />

    <!-- 加载中遮罩 -->
    <div v-if="store.isLoading" class="loading-overlay">
      <div class="loading-content">
        <span class="loading-text">载入中…</span>
        <div v-if="store.preloadProgress > 0" class="loading-bar-wrap">
          <div class="loading-bar" :style="{ width: store.preloadProgress + '%' }"></div>
        </div>
        <span v-if="store.preloadProgress > 0" class="loading-pct">{{ store.preloadProgress }}%</span>
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
  position: relative;
}

/* 主菜单 */
.main-menu {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #1a2332 0%, #0d1117 100%);
}

.menu-content {
  text-align: center;
  padding: 40px;
}

.menu-title {
  font-size: 48px;
  font-weight: 700;
  color: #e8e0cc;
  letter-spacing: 12px;
  margin: 0 0 16px;
  text-shadow: 0 2px 20px rgba(201, 169, 110, 0.3);
}

.menu-subtitle {
  color: rgba(201, 169, 110, 0.7);
  font-size: 16px;
  letter-spacing: 2px;
  margin: 0 0 8px;
}

.menu-desc {
  color: #8b95a8;
  font-size: 14px;
  line-height: 1.8;
  margin: 0 0 40px;
  max-width: 400px;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.menu-btn {
  width: 240px;
  padding: 12px 32px;
  background: rgba(255, 255, 255, 0.04);
  color: #e8e0cc;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 2px;
}

.menu-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(201, 169, 110, 0.3);
  color: rgba(201, 169, 110, 0.9);
}

.menu-btn.primary {
  background: linear-gradient(135deg, rgba(201, 169, 110, 0.2) 0%, rgba(201, 169, 110, 0.1) 100%);
  color: rgba(201, 169, 110, 0.9);
  border-color: rgba(201, 169, 110, 0.3);
}

.menu-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(201, 169, 110, 0.3) 0%, rgba(201, 169, 110, 0.15) 100%);
  border-color: rgba(201, 169, 110, 0.5);
  box-shadow: 0 4px 20px rgba(201, 169, 110, 0.2);
}

.menu-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* 游戏舞台 */
.game-stage {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #0d1117;
  user-select: none;
}

/* 探索态地点描述横幅（顶部，半透明） */
.explore-desc {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
  max-width: 70%;
  padding: 8px 20px;
  background: rgba(13, 17, 23, 0.7);
  border: 1px solid rgba(201, 169, 110, 0.2);
  border-radius: 20px;
  color: rgba(232, 224, 204, 0.85);
  font-size: 14px;
  letter-spacing: 1px;
  backdrop-filter: blur(4px);
  pointer-events: none;
  text-align: center;
}

/* 加载遮罩 */
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-text {
  color: rgba(201, 169, 110, 0.6);
  font-size: 18px;
  letter-spacing: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-bar-wrap {
  width: 240px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.loading-bar {
  height: 100%;
  background: rgba(201, 169, 110, 0.8);
  border-radius: 2px;
  transition: width 0.2s ease;
}

.loading-pct {
  color: rgba(201, 169, 110, 0.5);
  font-size: 13px;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
</style>
