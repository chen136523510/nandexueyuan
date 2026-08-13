<template>
  <div class="wordcloud-card">
    <div class="wc-header">
      <span class="wc-title">💬 群聊高频词</span>
      <span class="wc-sub">{{ total ? `基于 ${total.toLocaleString('zh-CN')} 条聊天记录` : '群聊历史记录' }}</span>
    </div>
    <div class="wc-stage" ref="stageRef">
      <canvas ref="canvasRef" class="wc-canvas"></canvas>
      <!-- hover 词条提示：显示词频 -->
      <div v-if="tip.visible" class="wc-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
        <span class="tip-word">{{ tip.word }}</span>
        <span class="tip-count">{{ tip.count.toLocaleString('zh-CN') }} 次</span>
      </div>
    </div>
    <p class="wc-hint">悬停词条查看词频</p>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import WordCloud from 'wordcloud'
import wordData from '../assets/wordcloud.json'

defineProps({
  // 群聊消息总数（由首页数据看板 API 提供，避免硬编码过时数字）
  total: { type: Number, default: 0 },
})

const canvasRef = ref(null)
const stageRef = ref(null)

// 词条悬浮提示（词 + 次数）
const tip = reactive({ visible: false, x: 0, y: 0, word: '', count: 0 })

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
    origin: [canvas.width / 2, canvas.height / 2],
    // hover 增强：词条悬停显示词频（item = [词, 权重]）
    hover: (item, dimension, event) => {
      if (!item) {
        tip.visible = false
        canvasRef.value.style.cursor = 'default'
        return
      }
      const rect = stageRef.value.getBoundingClientRect()
      const [word, count] = item
      tip.word = word
      tip.count = Number(count)
      tip.x = event.clientX - rect.left + 12
      tip.y = event.clientY - rect.top - 12
      tip.visible = true
      canvasRef.value.style.cursor = 'pointer'
    },
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
/* 舞台：包裹 canvas 与悬浮提示，提供定位基准 */
.wc-stage {
  position: relative;
}
.wc-canvas {
  width: 100%;
  display: block;
}
.wc-tip {
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 12px;
  background: var(--md-bg-card);
  border: 1px solid var(--md-primary);
  border-radius: var(--md-radius-full);
  box-shadow: var(--md-shadow);
  pointer-events: none;
  white-space: nowrap;
}
.tip-word {
  font-family: var(--md-font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--md-text);
}
.tip-count {
  font-size: 12px;
  color: var(--md-primary-hover);
  font-variant-numeric: tabular-nums;
}
.wc-hint {
  margin: 4px 0 0;
  text-align: right;
  font-size: 12px;
  color: var(--md-text-disabled);
}
</style>
