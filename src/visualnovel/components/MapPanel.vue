<script setup>
/**
 * 世界地图面板
 * 点击地图热点后全屏展示世界格局大图（纯展示模式）。
 * 后续可扩展为可交互选点（出门移动 / 添 Q&A）。
 * 套用 SettingsPanel 面板范式：v-if + store.activePanel + closePanel
 */
import { useVisualNovelStore } from '../stores/visualNovelStore.js'

const store = useVisualNovelStore()

function close() {
  store.closePanel()
}
</script>

<template>
  <div v-if="store.activePanel === 'map'" class="mp-overlay" @click.self="close">
    <div class="mp-panel">
      <div class="mp-header">
        <h2 class="mp-title">世界格局</h2>
        <button class="mp-close" @click="close">✕</button>
      </div>
      <div class="mp-body">
        <img
          src="/visualnovel/map/world_map.png"
          alt="世界地图"
          class="mp-map-img"
          @click.self="close"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mp-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
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
}

.mp-map-img {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
}
</style>
