<script setup>
import { computed } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'
import { CHAR_COLORS } from '../engine/types.js'

const store = useVisualNovelStore()

// 倒序显示历史（最新在最上）
const historyList = computed(() => {
  return [...store.history].reverse()
})

function speakerColor(speaker) {
  if (!speaker || speaker === '旁白') return CHAR_COLORS.narrator
  // 尝试匹配角色
  return CHAR_COLORS[speaker] || CHAR_COLORS.narrator
}

function close() {
  store.closePanel()
}
</script>

<template>
  <div v-if="store.activePanel === 'history'" class="hp-overlay" role="dialog" aria-modal="true" aria-label="对话回看面板" @click.self="close">
    <div class="hp-panel">
      <div class="hp-header">
        <h2 class="hp-title">对话回看</h2>
        <button class="hp-close" aria-label="关闭" data-testid="vn-history-close-btn" @click="close">✕</button>
      </div>

      <div class="hp-list">
        <div v-if="historyList.length === 0" class="hp-empty">
          暂无对话记录
        </div>
        <div
          v-for="(item, index) in historyList"
          :key="index"
          class="hp-item"
        >
          <span
            v-if="item.speaker"
            class="hp-speaker"
            :style="{ color: speakerColor(item.speaker) }"
          >
            {{ item.speaker }}
          </span>
          <p class="hp-text">{{ item.text }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hp-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hp-panel {
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid rgba(201, 169, 110, 0.2);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.hp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.hp-title {
  font-size: 18px;
  font-weight: 700;
  color: #e8e0cc;
}

.hp-close {
  background: none;
  border: none;
  color: #8b95a8;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

.hp-close:hover {
  color: #e8e0cc;
}

.hp-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hp-empty {
  text-align: center;
  color: #8b95a8;
  padding: 40px 0;
}

.hp-item {
  border-left: 2px solid rgba(201, 169, 110, 0.15);
  padding-left: 12px;
}

.hp-speaker {
  font-size: 13px;
  font-weight: 700;
  display: block;
  margin-bottom: 2px;
}

.hp-text {
  font-size: 14px;
  color: #e8e0cc;
  line-height: 1.7;
  margin: 0;
}
</style>
