<script setup>
import { computed } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'
import { CHAR_COLORS } from '../engine/types.js'

const store = useVisualNovelStore()

// 当前场景的角色列表（三态：narrator/active/dim，由 store 根据 speaker 推导）
const characters = computed(() => {
  return store.currentCharacters.map((char) => {
    return {
      ...char,
      color: CHAR_COLORS[char.id] || '#B0B0C0',
      // 立绘图路径：portrait 字段格式为 "{id}/{表情}"，直接拼
      imgSrc: `/visualnovel/portraits/${char.portrait || (char.id + '/normal')}.png`,
    }
  })
})
</script>

<template>
  <div class="char-layer">
    <Transition name="char-slide" mode="out-in">
      <div :key="characters.map(c => c.id + c.portrait).join(',')" class="char-container">
        <div
          v-for="char in characters"
          :key="char.id"
          class="char-portrait"
          :class="[`pos-${char.position || 'center'}`, char.state || 'narrator']"
        >
          <img :src="char.imgSrc" :alt="char.id" class="char-img" @error="$event.target.style.display='none'" />
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
  bottom: 0; /* 立绘脚底贴屏幕底边，对话框(z-index更高)自然遮住下半身 */
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: flex-end; /* 末行对齐 = 脚底对齐 */
  gap: 20px;
}

.char-portrait {
  transition: filter 0.4s ease, transform 0.4s ease;
}

/* 立绘图（日系VN标准：脚底贴底，对话框压住膝盖以下） */
.char-img {
  display: block;
  height: 85vh;
  max-height: 860px;
  width: auto;
  object-fit: contain;
  pointer-events: none;
}

/* 位置（均 align-self: flex-end 保证脚底对齐） */
.pos-left {
  align-self: flex-end;
  margin-right: auto;
  margin-left: 8%;
}
.pos-right {
  align-self: flex-end;
  margin-left: auto;
  margin-right: 8%;
}
.pos-center {
  align-self: flex-end;
  margin-left: auto;
  margin-right: auto;
}

/* ===== 三态：narrator / active / dim ===== */

/* 说话人：上移 + 提亮 */
.char-portrait.active {
  filter: brightness(1.12) saturate(1.08);
  transform: translateY(-24px);
}

/* 旁白态：全部对齐，正常亮度 */
.char-portrait.narrator {
  filter: brightness(1) saturate(1);
  transform: translateY(0);
}

/* 非说话人：变暗 */
.char-portrait.dim {
  filter: brightness(0.55) saturate(0.4);
  transform: translateY(0);
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
  .char-img {
    height: 55vh;
    max-height: 480px;
  }
  .pos-left {
    margin-left: 4%;
  }
  .pos-right {
    margin-right: 4%;
  }
}
</style>
