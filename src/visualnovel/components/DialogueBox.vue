<script setup>
import { computed, ref } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'
import { CHAR_COLORS, NodeType } from '../engine/types.js'

const store = useVisualNovelStore()

// 输入框值（本地 ref）
const inputValue = ref('')

// 当前说话者颜色
const speakerColor = computed(() => {
  const speaker = store.currentSpeaker
  if (!speaker) return null
  // 从角色列表里找到说话者的 id
  const char = store.currentCharacters.find((c) => c.active)
  if (char && CHAR_COLORS[char.id]) {
    return CHAR_COLORS[char.id]
  }
  // 旁白等特殊说话者
  return CHAR_COLORS.narrator
})

// 是否是旁白
const isNarrator = computed(() => {
  const speaker = store.currentSpeaker
  return !speaker || speaker === '旁白' || speaker === ''
})

// 是否显示选项（当前节点是 choice 类型）
const isChoice = computed(() => {
  return store.currentNode?.type === NodeType.CHOICE
})

// 是否是输入节点
const isInput = computed(() => {
  return store.currentNode?.type === NodeType.INPUT
})

// 是否显示对话内容（dialogue 和 input 都需要文本框）
const showDialogue = computed(() => {
  const node = store.currentNode
  if (!node) return false
  return node.type === NodeType.DIALOGUE || node.type === NodeType.INPUT
})

// 是否章节结束（有热点的 end 节点不算"结束"，而是自由探索模式）
const showEnd = computed(() => store.isEnded && store.currentHotspots.length === 0)
// 是否自由探索模式（end 节点带热点）
const isExploreMode = computed(() => store.isEnded && store.currentHotspots.length > 0)

// 当前 input 节点的 placeholder
const inputPlaceholder = computed(() => {
  return store.currentNode?.placeholder || '请输入...'
})

function handleClick() {
  // input 节点不响应点击推进
  if (isChoice.value || showEnd.value || isInput.value) return
  store.advance()
}

// 提交输入
function handleSubmit() {
  if (!inputValue.value.trim()) return
  store.submitInput(inputValue.value)
  inputValue.value = ''
}
</script>

<template>
  <div v-if="!store.hideUI" class="dialogue-area" @click="handleClick">
    <!-- 对话框 -->
    <div v-if="showDialogue && !showEnd" class="dialogue-box">
      <!-- 角色名标签 -->
      <div
        v-if="!isNarrator"
        class="speaker-tag"
        :style="{ color: speakerColor, borderColor: speakerColor }"
      >
        {{ store.currentSpeaker }}
      </div>

      <!-- 对话文本（打字机效果） -->
      <p class="dialogue-text">
        {{ store.displayedText }}
        <span v-if="store.isTyping" class="cursor">▋</span>
        <span v-else-if="!isInput" class="advance-hint">▼</span>
      </p>

      <!-- 输入框（input 节点打字完成后显示） -->
      <div v-if="isInput && !store.isTyping" class="input-area">
        <input
          ref="inputField"
          v-model="inputValue"
          type="text"
          class="vn-input"
          :placeholder="inputPlaceholder"
          maxlength="12"
          @keydown.enter.prevent="handleSubmit"
          @click.stop
        />
        <button class="input-btn" @click.stop="handleSubmit">确认</button>
      </div>
    </div>

    <!-- 章节结束 -->
    <div v-if="showEnd" class="end-box">
      <p class="end-text">- 章节结束 -</p>
    </div>

    <!-- 自由探索提示（序章结束后热点场景） -->
    <div v-if="isExploreMode" class="end-box explore-box">
      <p class="explore-text">点击场景中的人物或物品进行互动</p>
    </div>
  </div>
</template>

<style scoped>
.dialogue-area {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  cursor: pointer;
  padding: 0 16px 16px;
}

.dialogue-box {
  position: relative;
  background: rgba(13, 17, 23, 0.88);
  border: 1px solid rgba(201, 169, 110, 0.2);
  border-radius: 8px;
  padding: 24px 32px 20px;
  max-width: 900px;
  margin: 0 auto;
  min-height: 100px;
  backdrop-filter: blur(8px);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
}

/* 角色名标签 */
.speaker-tag {
  position: absolute;
  top: -14px;
  left: 24px;
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid;
  border-radius: 6px;
  padding: 2px 16px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
}

/* 对话文本 */
.dialogue-text {
  color: #e8e0cc;
  font-size: 16px;
  line-height: 1.85;
  letter-spacing: 0.5px;
  min-height: 56px;
}

/* 打字机光标 */
.cursor {
  animation: blink 0.6s infinite;
  color: rgba(201, 169, 110, 0.8);
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 推进提示箭头 */
.advance-hint {
  display: inline-block;
  color: rgba(201, 169, 110, 0.5);
  margin-left: 8px;
  animation: bob 1.5s ease-in-out infinite;
}

@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(3px); }
}

/* 章节结束 */
.end-box {
  text-align: center;
  padding: 40px 0;
}

.end-text {
  color: rgba(201, 169, 110, 0.6);
  font-size: 18px;
  letter-spacing: 4px;
}

/* 自由探索提示 */
.explore-box {
  padding: 16px 0;
}

.explore-text {
  color: rgba(232, 224, 204, 0.55);
  font-size: 14px;
  letter-spacing: 2px;
  margin: 0;
}

/* 输入框区域 */
.input-area {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
}

.vn-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(201, 169, 110, 0.3);
  border-radius: 6px;
  padding: 8px 14px;
  color: #e8e0cc;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.vn-input::placeholder {
  color: rgba(139, 149, 168, 0.6);
}

.vn-input:focus {
  border-color: rgba(201, 169, 110, 0.6);
  background: rgba(255, 255, 255, 0.08);
}

.input-btn {
  padding: 8px 20px;
  background: rgba(201, 169, 110, 0.15);
  border: 1px solid rgba(201, 169, 110, 0.3);
  border-radius: 6px;
  color: rgba(201, 169, 110, 0.9);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.input-btn:hover {
  background: rgba(201, 169, 110, 0.25);
  border-color: rgba(201, 169, 110, 0.5);
}

/* 移动端 */
@media (max-width: 768px) {
  .dialogue-area {
    padding: 0 8px 8px;
  }
  .dialogue-box {
    padding: 20px 16px 16px;
    min-height: 80px;
  }
  .dialogue-text {
    font-size: 14px;
    line-height: 1.75;
  }
  .speaker-tag {
    left: 12px;
    font-size: 12px;
    padding: 2px 12px;
  }
  .vn-input {
    font-size: 14px;
    padding: 6px 10px;
  }
  .input-btn {
    padding: 6px 14px;
    font-size: 13px;
  }
}
</style>
