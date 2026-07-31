<script setup>
import { ref, watch, computed } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'

const store = useVisualNovelStore()

// 当前显示的背景（带过渡动画）
const displayBg = ref('')
const prevBg = ref('')
const transitioning = ref(false)

// 已生成的真实背景图清单（存在于 public/visualnovel/bg/ 下）
// 未列入的 bgKey 仍回退 CSS 渐变占位
// key -> 实际文件名(不含扩展名)。同名可省略value，不同名用映射(如多个key指向同一张图)
const REAL_BG_MAP = {
  'bg/void_world': null,
  'bg/grassland': null,
  'bg/tower_day': null,
  'bg/tower_interior_hall': null,
  'bg/tower_lobby': 'bg/tower_interior_hall', // 命名不统一，指向同一张大厅图
  'bg/tower_interior_hall_prologue': null, // 序章结束后场景（见+添画入场景）
  'bg/tower_outdoor_mist': null,
  'bg/tower_interior': null,
}

// 背景资源映射（PoC 阶段用 CSS 渐变占位，后续替换为真实图片）
const BG_FALLBACK = {
  'bg/void_world': 'radial-gradient(ellipse at 50% 40%, #1a1a2e 0%, #0d0d1a 100%)',
  'bg/tower_night': 'radial-gradient(ellipse at 50% 60%, #1a2332 0%, #0d1117 100%)',
  'bg/tower_day': 'linear-gradient(180deg, #2a3a4a 0%, #1a2332 100%)',
  'bg/grassland': 'linear-gradient(180deg, #3a3a2e 0%, #2a2a1e 100%)',
  'bg/empire_border': 'linear-gradient(180deg, #2e2a3a 0%, #1a1520 100%)',
  'bg/black': '#000000',
}

watch(
  () => store.currentBackground,
  (newBg) => {
    if (newBg && newBg !== displayBg.value) {
      prevBg.value = displayBg.value
      displayBg.value = newBg
      transitioning.value = true
      setTimeout(() => {
        transitioning.value = false
      }, 600)
    }
  }
)

// 优先加载真实图片，未生成的回退 CSS 渐变占位
function getBgStyle(bgKey) {
  if (bgKey in REAL_BG_MAP) {
    const fileKey = REAL_BG_MAP[bgKey] || bgKey
    return `url(/visualnovel/${fileKey}.png)`
  }
  return BG_FALLBACK[bgKey] || 'radial-gradient(ellipse at center, #1a2332 0%, #0d1117 100%)'
}
</script>

<template>
  <div class="bg-layer">
    <!-- 旧背景（淡出） -->
    <div
      v-if="transitioning && prevBg"
      class="bg-image bg-prev"
      :style="{ backgroundImage: getBgStyle(prevBg), backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }"
    />
    <!-- 新背景（淡入） -->
    <div
      v-if="displayBg"
      class="bg-image bg-current"
      :class="{ 'fade-in': transitioning }"
      :style="{ backgroundImage: getBgStyle(displayBg), backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }"
    />
    <!-- 默认背景（无背景时） -->
    <div
      v-if="!displayBg"
      class="bg-image"
      style="background-image: radial-gradient(ellipse at center, #1a2332 0%, #0d1117 100%); background-size: cover; background-repeat: no-repeat; background-position: center"
    />
  </div>
</template>

<style scoped>
.bg-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.bg-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: opacity 0.6s ease;
}

.bg-prev {
  opacity: 0;
}

.bg-current {
  opacity: 1;
}

.bg-current.fade-in {
  animation: bgFadeIn 0.6s ease;
}

@keyframes bgFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
