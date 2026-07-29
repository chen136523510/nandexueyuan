<script setup>
import { computed } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'

const store = useVisualNovelStore()

const buttons = computed(() => [
  { id: 'save', label: '存档', icon: '💾', action: () => store.togglePanel('save') },
  { id: 'load', label: '读档', icon: '📂', action: () => store.togglePanel('load') },
  { id: 'history', label: '回看', icon: '📜', action: () => store.togglePanel('history') },
  { id: 'auto', label: '自动', icon: '▶', active: store.autoMode, action: () => store.toggleAutoMode() },
  { id: 'settings', label: '设置', icon: '⚙', action: () => store.togglePanel('settings') },
  { id: 'hide', label: '隐藏', icon: '👁', action: () => store.toggleHideUI() },
])
</script>

<template>
  <div v-if="!store.hideUI" class="quick-menu">
    <button
      v-for="btn in buttons"
      :key="btn.id"
      class="qm-btn"
      :class="{ active: btn.active }"
      :title="btn.label"
      @click.stop="btn.action"
    >
      <span class="qm-icon">{{ btn.icon }}</span>
      <span class="qm-label">{{ btn.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.quick-menu {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 30;
  display: flex;
  gap: 4px;
  background: rgba(13, 17, 23, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 4px;
  backdrop-filter: blur(8px);
}

.qm-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 48px;
}

.qm-btn:hover {
  background: rgba(201, 169, 110, 0.12);
}

.qm-btn.active {
  background: rgba(201, 169, 110, 0.2);
}

.qm-icon {
  font-size: 16px;
  line-height: 1;
}

.qm-label {
  font-size: 10px;
  color: rgba(232, 224, 204, 0.6);
  line-height: 1;
}

.qm-btn:hover .qm-label {
  color: rgba(201, 169, 110, 0.9);
}

.qm-btn.active .qm-label {
  color: rgba(201, 169, 110, 1);
}

/* 移动端：只显示图标 */
@media (max-width: 768px) {
  .quick-menu {
    top: 8px;
    right: 8px;
    padding: 2px;
  }
  .qm-btn {
    padding: 6px 8px;
    min-width: 36px;
  }
  .qm-label {
    display: none;
  }
  .qm-icon {
    font-size: 18px;
  }
}
</style>
