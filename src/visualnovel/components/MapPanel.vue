<script setup>
/**
 * 世界地图面板
 * - 手动模式：QuickMenu/hotspot 触发，纯展示，可手动关闭
 * - 演出模式：dialogue 节点 mapHighlight 字段触发，自动弹出+高亮地点，不可手动关闭
 *
 * 套用 SettingsPanel 面板范式：v-if + store.activePanel + closePanel
 */
import { computed } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'
import { MAP_LOCATIONS } from '../data/locations.js'

const store = useVisualNovelStore()

// 演出模式下的高亮地点（来自当前 dialogue 节点的 mapHighlight 字段）
const highlightLocation = computed(() => store.currentMapHighlight)
const isStoryMode = computed(() => !!highlightLocation.value)

// 高亮地点的坐标数据
const highlightData = computed(() => {
  if (!highlightLocation.value) return null
  return MAP_LOCATIONS[highlightLocation.value] || null
})

// 手动模式才允许关闭
function close() {
  if (isStoryMode.value) return  // 演出模式由剧本控制，不可手动关闭
  store.closePanel()
}
</script>

<template>
  <!-- 手动模式：通过 activePanel === 'map' 触发 -->
  <div
    v-if="store.activePanel === 'map' || isStoryMode"
    class="mp-overlay"
    :class="{ 'mp-story-mode': isStoryMode }"
    role="dialog"
    aria-modal="true"
    aria-label="世界地图面板"
    @click.self="close"
  >
    <div class="mp-panel">
      <div class="mp-header" v-if="!isStoryMode">
        <h2 class="mp-title">世界格局</h2>
        <button class="mp-close" aria-label="关闭" data-testid="vn-map-close-btn" @click="close">✕</button>
      </div>
      <div class="mp-body" :class="{ 'mp-body-story': isStoryMode }">
        <img
          src="/visualnovel/map/world_map.webp"
          alt="世界地图"
          class="mp-map-img"
          @click.self="close"
        />
        <!-- 高亮标记（脉冲圆圈 + 标签） -->
        <div
          v-if="highlightData"
          class="mp-highlight"
          :style="{ left: highlightData.x + '%', top: highlightData.y + '%' }"
        >
          <div class="mp-pulse-ring"></div>
          <div class="mp-pulse-ring mp-pulse-ring-2"></div>
          <div class="mp-highlight-dot"></div>
          <div class="mp-highlight-label">{{ highlightData.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mp-overlay {
  position: absolute;
  inset: 0;
  z-index: 15;  /* 高于 CharacterLayer(z:1) 和 HotspotLayer(z:5)，低于 DialogueBox(z:10) */
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 演出模式：让对话浮在地图上 */
.mp-story-mode {
  z-index: 15;
  background: rgba(0, 0, 0, 0.85);
}

.mp-panel {
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid rgba(201, 169, 110, 0.2);
  border-radius: 12px;
  width: 95%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.mp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.mp-title {
  font-size: 18px;
  font-weight: 700;
  color: #e8e0cc;
}

.mp-close {
  background: none;
  border: none;
  color: #8b95a8;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

.mp-close:hover {
  color: #e8e0cc;
}

.mp-body {
  padding: 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;  /* 高亮标记的定位基准 */
}

/* 演出模式：地图更大，去掉 padding */
.mp-body-story {
  padding: 0;
}

.mp-map-img {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
}

/* ===== 高亮标记 ===== */
.mp-highlight {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.mp-pulse-ring {
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border: 2px solid rgba(201, 169, 110, 0.8);
  border-radius: 50%;
  animation: mp-pulse 2s ease-out infinite;
}

.mp-pulse-ring-2 {
  animation-delay: 1s;
}

@keyframes mp-pulse {
  0% {
    width: 20px;
    height: 20px;
    opacity: 1;
  }
  100% {
    width: 60px;
    height: 60px;
    opacity: 0;
  }
}

.mp-highlight-dot {
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: #c9a96e;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(201, 169, 110, 0.9);
}

.mp-highlight-label {
  position: absolute;
  top: 14px;
  left: 0;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: #e8e0cc;
  background: rgba(13, 17, 23, 0.85);
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid rgba(201, 169, 110, 0.3);
}
</style>
