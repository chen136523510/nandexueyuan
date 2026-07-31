<script setup>
/**
 * 轻提示弹窗（"敬请期待"等）
 * 复用 InventoryPanel 的 detail-overlay 模式。
 * z-index: 45（面板层之上）
 */
import { useVisualNovelStore } from '../stores/visualNovelStore.js'

const store = useVisualNovelStore()
</script>

<template>
  <div v-if="store.noticeMessage" class="notice-overlay" @click.self="store.closeNotice()">
    <div class="notice-panel">
      <div class="notice-icon">🗺️</div>
      <p class="notice-text">{{ store.noticeMessage }}</p>
      <button class="notice-btn" @click="store.closeNotice()">知道了</button>
    </div>
  </div>
</template>

<style scoped>
.notice-overlay {
  position: absolute;
  inset: 0;
  z-index: 45;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.notice-panel {
  background: rgba(13, 17, 23, 0.98);
  border: 1px solid rgba(201, 169, 110, 0.3);
  border-radius: 12px;
  padding: 32px 40px;
  max-width: 320px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.notice-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.notice-text {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(232, 224, 204, 0.85);
  margin: 0 0 20px 0;
}

.notice-btn {
  padding: 8px 28px;
  font-size: 14px;
  color: rgba(232, 224, 204, 0.9);
  background: rgba(201, 169, 110, 0.12);
  border: 1px solid rgba(201, 169, 110, 0.4);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notice-btn:hover {
  background: rgba(201, 169, 110, 0.2);
  border-color: rgba(201, 169, 110, 0.7);
}
</style>
