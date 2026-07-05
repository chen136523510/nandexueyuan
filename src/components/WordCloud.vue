<template>
  <div class="wordcloud-card">
    <div class="wc-header">
      <span class="wc-title">💬 群聊高频词</span>
      <span class="wc-sub">基于 55.8 万条聊天记录</span>
    </div>
    <canvas ref="canvasRef" class="wc-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import WordCloud from 'wordcloud'
import { MessageCircle } from 'lucide-vue-next'
import wordData from '../assets/wordcloud.json'

const canvasRef = ref(null)

const colors = ['#A8C5A0', '#AEC2CF', '#D4A574', '#C9A0A0', '#94B48C', '#9DB8C9', '#C8B090', '#B8A8A8', '#8FA882', '#7E95A3']
const maxVal = wordData[0]?.value || 1

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const w = canvas.offsetWidth
  const h = 420
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.height = h + 'px'

  WordCloud(canvas, {
    list: wordData.map(d => [d.name, d.value]),
    gridSize: Math.round(8 * dpr),
    weightFactor: size => Math.max(14, (size / maxVal) * 54) * dpr,
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    fontWeight: 'bold',
    color: () => colors[Math.floor(Math.random() * colors.length)],
    backgroundColor: 'transparent',
    rotateRatio: 0.3,
    rotationSteps: 2,
    minRotation: -Math.PI / 6,
    maxRotation: Math.PI / 6,
    drawOutOfBound: false,
    shrinkToFit: true,
    origin: [canvas.width / 2, canvas.height / 2]
  })
}

let ro = null
onMounted(() => {
  draw()
  ro = new ResizeObserver(() => {
    WordCloud.stop()
    draw()
  })
  ro.observe(canvasRef.value)
})

onBeforeUnmount(() => {
  WordCloud.stop()
  ro && ro.disconnect()
})
</script>

<style scoped>
.wordcloud-card {
  background: var(--md-bg-card);
  border-radius: var(--md-radius-lg);
  border: 1px solid var(--md-border);
  box-shadow: var(--md-shadow-sm);
  padding: 20px 24px 16px;
  margin-bottom: 16px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
.wordcloud-card:hover {
  box-shadow: var(--md-shadow);
  border-color: var(--md-primary);
}
.wc-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
}
.wc-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--md-text);
}
.wc-sub {
  font-size: 12px;
  color: var(--md-text-secondary);
}
.wc-canvas {
  width: 100%;
  display: block;
}
</style>
