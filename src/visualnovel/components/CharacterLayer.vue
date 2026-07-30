<script setup>
import { computed } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'
import { CHAR_COLORS } from '../engine/types.js'

const store = useVisualNovelStore()

// 当前场景的角色列表（三态：narrator/active/dim，由 store 根据 speaker 推导）
// store 已按角色 id 固定排序，保证跨节点 DOM 位置恒定
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
    <!--
      TransitionGroup：仅在新角色加入/离开时触发入场/退场动画。
      已存在的角色不重建 DOM，其三态变化（active/dim/narrator）通过 CSS class
      的 filter + transform 过渡完成（上移提亮 / 变暗）。
      key 固定为 char.id，不随说话人变化。

      布局用绝对定位（非 flex），每个角色位置独立固定，不受其他角色增减影响。
    -->
    <TransitionGroup name="char-enter" tag="div" class="char-container">
      <div
        v-for="char in characters"
        :key="char.id"
        class="char-portrait"
        :class="[`pos-${char.position || 'center'}`, char.state || 'narrator']"
      >
        <img :src="char.imgSrc" :alt="char.id" class="char-img" @error="$event.target.style.display='none'" />
      </div>
    </TransitionGroup>
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
  inset: 0;
}

/*
 * 绝对定位布局：每个角色独立固定在屏幕底部，互不影响。
 * 用 CSS 变量 --tx / --ty 组合 transform，避免 translateX(-50%) 和 translateY(-24px) 冲突。
 */
.char-portrait {
  position: absolute;
  bottom: 0;             /* 脚底贴屏幕底边，对话框自然遮住下半身 */
  --tx: 0px;             /* 水平偏移（center 时为 -50% 居中） */
  --ty: 0px;             /* 垂直偏移（active 时上移） */
  transform: translate(var(--tx), var(--ty));
  transition: filter 0.4s ease, transform 0.4s ease, left 0.4s ease, right 0.4s ease;
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

/* ===== 位置（绝对定位，互不影响） ===== */
.pos-left {
  left: 5%;
}
.pos-right {
  right: 5%;
}
.pos-center {
  left: 50%;
  --tx: -50%;   /* 自身宽度的一半，实现水平居中 */
}

/* ===== 三态：narrator / active / dim ===== */
/* 原则：说话人立绘上移 + 提亮，非说话人变暗，旁白态全部正常 */

/* 说话人：上移 + 提亮 */
.char-portrait.active {
  --ty: -24px;
  filter: brightness(1.15) saturate(1.1);
}

/* 旁白态：全部对齐，正常亮度 */
.char-portrait.narrator {
  --ty: 0px;
  filter: brightness(1) saturate(1);
}

/* 非说话人：变暗 */
.char-portrait.dim {
  --ty: 0px;
  filter: brightness(0.55) saturate(0.4);
}

/* 角色入场/退场动画（仅新增/移除角色时触发，不影响已存在角色的三态过渡） */
.char-enter-enter-active {
  transition: opacity 0.4s ease;
}
.char-enter-leave-active {
  transition: opacity 0.3s ease;
}
.char-enter-enter-from {
  opacity: 0;
}
.char-enter-leave-to {
  opacity: 0;
}
</style>
