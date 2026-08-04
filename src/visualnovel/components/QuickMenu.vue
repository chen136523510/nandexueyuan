<script setup>
import { computed } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'

const store = useVisualNovelStore()

const buttons = computed(() => [
  { id: 'inventory', label: '背包', icon: '🎒', action: () => store.togglePanel('inventory') },
  { id: 'save', label: '存档', icon: '💾', action: () => store.togglePanel('save') },
  { id: 'history', label: '回看', icon: '📜', action: () => store.togglePanel('history') },
  { id: 'auto', label: '自动', icon: '▶', active: store.autoMode, action: () => store.toggleAutoMode() },
  { id: 'settings', label: '设置', icon: '⚙', action: () => store.togglePanel('settings') },
  { id: 'hide', label: '隐藏', icon: '👁', action: () => store.toggleHideUI() },
])
</script>

<template>
  <!-- 正常状态：左上角竖排快捷栏（原神/永恒世界风格） -->
  <div v-if="!store.hideUI" class="quick-menu" data-no-advance>
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

  <!-- 隐藏UI后：浮动恢复按钮 -->
  <button
    v-else
    class="qm-show-btn"
    title="显示菜单"
    data-no-advance
    @click.stop="store.toggleHideUI()"
  >
    <span class="qm-icon">👁</span>
  </button>
</template>

<style scoped>
/* 原神/永恒世界风格：左上角竖排半透明图标列 */
.quick-menu {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(13, 17, 23, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 4px;
  backdrop-filter: blur(8px);
}

.qm-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 40px;
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
  font-size: 11px;
  color: rgba(232, 224, 204, 0.55);
  line-height: 1;
  white-space: nowrap;
}

.qm-btn:hover .qm-label {
  color: rgba(201, 169, 110, 0.9);
}

.qm-btn.active .qm-label {
  color: rgba(201, 169, 110, 1);
}

/* 浮动恢复按钮（UI隐藏时显示） */
.qm-show-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(13, 17, 23, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  cursor: pointer;
  backdrop-filter: blur(8px);
  opacity: 0.4;
  transition: opacity 0.3s ease;
}

.qm-show-btn:hover {
  opacity: 1;
}

.qm-show-btn .qm-icon {
  font-size: 16px;
  line-height: 1;
}

/* 移动端 */
@media (max-width: 768px) {
  .quick-menu {
    top: 8px;
    left: 8px;
    padding: 2px;
  }
  .qm-btn {
    padding: 6px 8px;
  }
  .qm-label {
    font-size: 10px;
  }
  .qm-icon {
    font-size: 18px;
  }
  .qm-show-btn {
    top: 8px;
    left: 8px;
    width: 36px;
    height: 36px;
  }
}
</style>
