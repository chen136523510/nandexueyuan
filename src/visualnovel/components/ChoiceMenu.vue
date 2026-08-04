<script setup>
import { computed } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'
import { NodeType, ChoiceImpact } from '../engine/types.js'

const store = useVisualNovelStore()

// 当前选项列表
const choices = computed(() => {
  const node = store.currentNode
  if (!node || node.type !== NodeType.CHOICE) return []
  return node.choices || []
})

// 判断选项是否已被选过
function isChoiceSelected(index) {
  const node = store.currentNode
  if (!node) return false
  const made = store.choicesMade[node.id]
  return made && made.includes(index)
}

// 是否为推进剧情的关键选项（标黄）
function isCritical(choice) {
  return choice.impact === ChoiceImpact.CRITICAL
}

function handleSelect(index) {
  store.selectChoice(index)
}
</script>

<template>
  <div v-if="choices.length > 0 && !store.hideUI" class="choice-overlay" data-no-advance>
    <div class="choice-container">
      <div
        v-for="(choice, index) in choices"
        :key="index"
        class="choice-btn"
        :class="{
          selected: isChoiceSelected(index),
          critical: isCritical(choice),
          info: !isCritical(choice)
        }"
        @click="handleSelect(index)"
      >
        <span class="choice-marker" />
        <span class="choice-text">{{ choice.text }}</span>
        <span v-if="isChoiceSelected(index)" class="choice-check">✓</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.choice-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
}

.choice-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 500px;
  width: 90%;
}

.choice-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 8px;
  padding: 16px 24px;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

/* 关键选项 - 标黄（推进剧情，不可逆） */
.choice-btn.critical {
  background: rgba(201, 169, 97, 0.12);
  border: 1px solid rgba(201, 169, 97, 0.35);
}

.choice-btn.critical:hover {
  background: rgba(201, 169, 97, 0.25);
  border-color: rgba(201, 169, 97, 0.7);
  transform: translateX(4px);
}

.choice-btn.critical .choice-marker {
  width: 3px;
  height: 24px;
  background: rgba(201, 169, 97, 0.6);
  border-radius: 2px;
  transition: all 0.25s ease;
  flex-shrink: 0;
}

.choice-btn.critical:hover .choice-marker {
  background: rgba(201, 169, 97, 1);
  height: 32px;
}

.choice-btn.critical .choice-text {
  color: #f0d896;
  font-size: 15px;
  line-height: 1.6;
  flex: 1;
}

/* 信息选项 - 标白（补充信息，可返回重选） */
.choice-btn.info {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.choice-btn.info:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateX(4px);
}

.choice-btn.info .choice-marker {
  width: 3px;
  height: 24px;
  background: rgba(200, 210, 225, 0.3);
  border-radius: 2px;
  transition: all 0.25s ease;
  flex-shrink: 0;
}

.choice-btn.info:hover .choice-marker {
  background: rgba(200, 210, 225, 0.6);
  height: 32px;
}

.choice-btn.info .choice-text {
  color: #c8d2e1;
  font-size: 15px;
  line-height: 1.6;
  flex: 1;
}

/* 关键选项标签 */
.choice-tag {
  font-size: 11px;
  color: rgba(201, 169, 97, 0.8);
  border: 1px solid rgba(201, 169, 97, 0.3);
  border-radius: 3px;
  padding: 1px 6px;
  flex-shrink: 0;
}

/* 已选过的选项标灰 */
.choice-btn.selected {
  opacity: 0.5;
}

.choice-btn.selected .choice-text {
  color: #8b95a8;
  text-decoration: line-through;
  text-decoration-color: rgba(139, 149, 168, 0.3);
}

.choice-btn.selected:hover {
  opacity: 0.7;
}

.choice-check {
  color: rgba(201, 169, 110, 0.6);
  font-size: 14px;
  flex-shrink: 0;
}

/* 移动端 */
@media (max-width: 768px) {
  .choice-container {
    gap: 8px;
    width: 94%;
  }
  .choice-btn {
    padding: 14px 16px;
  }
  .choice-text {
    font-size: 14px;
  }
}
</style>
