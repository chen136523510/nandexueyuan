<script setup>
/**
 * 热点交互层
 * 序章结束后/探索态（R-035）的自由探索场景，在背景图上渲染可交互的按钮标识。
 * 显示条件：剧情 end 节点带 hotspots（isEnded）或探索态合成节点（isExploring）。
 * z-index: 5（立绘层之上、对话框之下）
 *
 * 热点数据结构：
 *   { id, x, y, label, icon, action: { type: 'goto'|'notice'|'map'|'travel', target|message|to } }
 *   x/y 为按钮中心点的百分比坐标
 *   kind: 'exit' 为地点出口（travel 动作，样式微区分）
 */
import { useVisualNovelStore } from '../stores/visualNovelStore.js'

const store = useVisualNovelStore()

function handleHotspot(hotspot) {
  const action = hotspot.action
  if (!action) return
  if (action.type === 'goto') {
    store.goToNode(action.target)
  } else if (action.type === 'notice') {
    store.showNotice(action.message)
  } else if (action.type === 'map') {
    store.togglePanel('map')
  } else if (action.type === 'travel') {
    store.travelTo(action.to)
  }
}
</script>

<template>
  <div
    v-if="(store.isEnded || store.isExploring) && store.currentHotspots.length"
    class="hotspot-layer"
    data-no-advance
  >
    <button
      v-for="spot in store.currentHotspots"
      :key="spot.id"
      class="hotspot-btn"
      :class="{ 'hotspot-btn-exit': spot.kind === 'exit' }"
      :style="{ left: spot.x + '%', top: spot.y + '%' }"
      :aria-label="spot.label"
      :data-testid="`vn-hotspot-${spot.id}`"
      @click.stop="handleHotspot(spot)"
    >
      <span class="hotspot-icon">{{ spot.icon || '💬' }}</span>
      <span class="hotspot-label">{{ spot.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.hotspot-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.hotspot-btn {
  position: absolute;
  /* 用 transform 居中到 x/y 坐标点 */
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  pointer-events: auto;
  background: none;
  border: none;
  padding: 0;
  transition: transform 0.2s ease;
}

/* 脉冲光环（提示可交互） */
.hotspot-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.15);
  border: 2px solid rgba(201, 169, 110, 0.5);
  animation: hotspotPulse 2s ease-in-out infinite;
}

@keyframes hotspotPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.7;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 1;
  }
}

.hotspot-icon {
  position: relative;
  z-index: 1;
  font-size: 22px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(13, 17, 23, 0.85);
  border: 2px solid rgba(201, 169, 110, 0.6);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  transition: all 0.2s ease;
}

.hotspot-label {
  font-size: 12px;
  color: rgba(232, 224, 204, 0.8);
  background: rgba(13, 17, 23, 0.85);
  border: 1px solid rgba(201, 169, 110, 0.25);
  border-radius: 4px;
  padding: 1px 8px;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.hotspot-btn:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

.hotspot-btn:hover .hotspot-icon {
  background: rgba(201, 169, 110, 0.25);
  border-color: rgba(201, 169, 110, 0.9);
  box-shadow: 0 0 20px rgba(201, 169, 110, 0.35);
}

.hotspot-btn:hover .hotspot-label {
  color: rgba(232, 224, 204, 1);
  border-color: rgba(201, 169, 110, 0.6);
}

/* 出口按钮（地点转移）：冷色调区分，偏"通道"感 */
.hotspot-btn-exit .hotspot-icon {
  border-color: rgba(139, 149, 168, 0.6);
}

.hotspot-btn-exit .hotspot-label {
  border-color: rgba(139, 149, 168, 0.3);
}

.hotspot-btn-exit:hover .hotspot-icon {
  background: rgba(139, 149, 168, 0.25);
  border-color: rgba(139, 149, 168, 0.9);
}
</style>
