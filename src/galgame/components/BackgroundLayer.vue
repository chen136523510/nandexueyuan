<script setup>
import { ref, watch } from 'vue'
import { useGalgameStore } from '../stores/galgameStore.js'

const store = useGalgameStore()

// 当前显示的背景（带过渡动画）
const displayBg = ref('')
const prevBg = ref('')
const transitioning = ref(false)

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

function getBgStyle(bgKey) {
  // PoC 阶段：优先用 CSS 渐变占位
  // 后续：return `url(/galgame/${bgKey}.jpg)`
  return BG_FALLBACK[bgKey] || 'radial-gradient(ellipse at center, #1a2332 0%, #0d1117 100%)'
}
</script>

<template>
  <div class="bg-layer">
    <!-- 旧背景（淡出） -->
    <div
      v-if="transitioning && prevBg"
      class="bg-image bg-prev"
      :style="{ background: getBgStyle(prevBg) }"
    />
    <!-- 新背景（淡入） -->
    <div
      v-if="displayBg"
      class="bg-image bg-current"
      :class="{ 'fade-in': transitioning }"
      :style="{ background: getBgStyle(displayBg) }"
    />
    <!-- 默认背景（无背景时） -->
    <div
      v-if="!displayBg"
      class="bg-image"
      style="background: radial-gradient(ellipse at center, #1a2332 0%, #0d1117 100%)"
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
