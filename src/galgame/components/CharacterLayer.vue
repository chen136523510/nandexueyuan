<script setup>
import { computed } from 'vue'
import { useGalgameStore } from '../stores/galgameStore.js'
import { CHAR_COLORS } from '../engine/types.js'

const store = useGalgameStore()

// 当前场景的角色列表（带活跃状态：说话者高亮，其他 dim）
const characters = computed(() => {
  return store.currentCharacters.map((char) => {
    const isActive = char.active === true
    return {
      ...char,
      color: CHAR_COLORS[char.id] || '#B0B0C0',
      isActive,
    }
  })
})

// PoC 占位：根据角色 id 显示名字色块（后续替换为真实立绘图）
const CHAR_NAMES = {
  rui: '睿帝',
  qiu: '丘',
  jie: '杰',
  wang: '汪神',
  muren: '牧羊人',
  faci: '法刺',
  member: '冒险者',
}
</script>

<template>
  <div class="char-layer">
    <Transition name="char-slide" mode="out-in">
      <div :key="characters.map(c => c.id + c.portrait).join(',')" class="char-container">
        <div
          v-for="char in characters"
          :key="char.id"
          class="char-portrait"
          :class="[`pos-${char.position || 'center'}`, { active: char.isActive, dim: !char.isActive }]"
        >
          <!-- PoC 占位：色块 + 角色名 -->
          <!-- 后续替换为: <img :src="`/galgame/portraits/${char.id}/${char.portrait}.png`" /> -->
          <div class="char-placeholder" :style="{ borderColor: char.color }">
            <span class="char-name-tag" :style="{ color: char.color }">
              {{ CHAR_NAMES[char.id] || char.id }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.char-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.char-container {
  position: absolute;
  bottom: 180px; /* 留出底部对话框空间 */
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 20px;
}

.char-portrait {
  transition: filter 0.4s ease, transform 0.4s ease;
}

/* 位置 */
.pos-left {
  align-self: flex-start;
  margin-right: auto;
  margin-left: 8%;
}
.pos-right {
  align-self: flex-end;
  margin-left: auto;
  margin-right: 8%;
}
.pos-center {
  flex-shrink: 0;
}

/* 活跃状态（说话者）：清晰 + 轻微放大 */
.char-portrait.active {
  filter: brightness(1) saturate(1);
  transform: scale(1);
}

/* 非活跃状态：dim（变暗 + 去饱和） */
.char-portrait.dim {
  filter: brightness(0.5) saturate(0.4);
  transform: scale(0.95);
}

/* PoC 占位样式 */
.char-placeholder {
  width: 200px;
  height: 380px;
  border: 2px solid;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 16px;
}

.char-name-tag {
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

/* 立绘滑入动画 */
.char-slide-enter-active,
.char-slide-leave-active {
  transition: all 0.4s ease;
}
.char-slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.char-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .char-container {
    bottom: 160px;
    gap: 8px;
  }
  .char-placeholder {
    width: 120px;
    height: 240px;
  }
  .char-name-tag {
    font-size: 14px;
  }
  .pos-left {
    margin-left: 4%;
  }
  .pos-right {
    margin-right: 4%;
  }
}
</style>
