<script setup>
/**
 * 热点交互层
 * 序章结束后的自由探索场景，在背景图上渲染可点击区域。
 * 仅在 isEnded 且当前节点有 hotspots 时显示。
 * z-index: 5（立绘层之上、对话框之下）
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
  }
}
</script>

<template>
  <div v-if="store.isEnded && store.currentHotspots.length" class="hotspot-layer">
    <div
      v-for="spot in store.currentHotspots"
      :key="spot.id"
      class="hotspot"
      :style="{
        left: spot.x + '%',
        top: spot.y + '%',
        width: spot.w + '%',
        height: spot.h + '%',
      }"
      @click.stop="handleHotspot(spot)"
    >
      <span class="hotspot-label">{{ spot.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.hotspot-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.hotspot {
  position: absolute;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  transition: all 0.2s ease;
}

/* 默认轻微提示边框（可点击区域） */
.hotspot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: rgba(201, 169, 110, 0.04);
  border: 1px dashed rgba(201, 169, 110, 0.2);
  transition: all 0.2s ease;
  pointer-events: none;
}

/* hover 高亮 */
.hotspot:hover::after {
  background: rgba(201, 169, 110, 0.15);
  border: 1px solid rgba(201, 169, 110, 0.6);
  box-shadow: 0 0 16px rgba(201, 169, 110, 0.2);
}

.hotspot-label {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 10px;
  font-size: 13px;
  color: rgba(232, 224, 204, 0.5);
  background: rgba(13, 17, 23, 0.6);
  border: 1px solid rgba(201, 169, 110, 0.2);
  border-radius: 4px;
  white-space: nowrap;
  transition: all 0.2s ease;
  pointer-events: none;
}

.hotspot:hover .hotspot-label {
  color: rgba(232, 224, 204, 1);
  background: rgba(13, 17, 23, 0.9);
  border-color: rgba(201, 169, 110, 0.6);
  box-shadow: 0 0 12px rgba(201, 169, 110, 0.25);
}
</style>
