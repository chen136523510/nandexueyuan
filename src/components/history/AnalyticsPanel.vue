<script setup>
/**
 * 学院数据面板（岁月史书·默认 tab）
 *
 * 展示：各模块使用频率（访问次数 + 独立用户）+ 平均停留时间
 * 数据源：后端 /analytics/summary?days=N（前端埋点自动上报）
 * 视觉：频率用横向条形图（莫兰迪色），停留时间格式化（分秒）
 */
import { ref, computed, onMounted } from 'vue'
import { getAnalyticsSummary } from '../../api/analytics'

const days = ref(30)
const loading = ref(false)
const data = ref(null)
const error = ref('')

const DAYS_OPTIONS = [7, 14, 30, 90, 365]

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await getAnalyticsSummary(days.value)
    // 拦截器已剥一层 axios response：res = { code, message, data }
    data.value = res.data
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

// 横向条形图：最大访问次数归一化
const maxVisits = computed(() => {
  if (!data.value?.modules?.length) return 1
  return Math.max(...data.value.modules.map(m => m.visits), 1)
})

const maxAvgSec = computed(() => {
  if (!data.value?.modules?.length) return 1
  return Math.max(...data.value.modules.map(m => m.avgSec || 0), 1)
})

function formatDuration(sec) {
  if (sec == null) return '—'
  if (sec < 60) return `${sec}秒`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s ? `${m}分${s}秒` : `${m}分`
}

function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`
  return d.toLocaleDateString('zh-CN')
}

// 模块色板（与编辑器风格一致，莫兰迪系）
const moduleColors = {
  home: '#A8C5A0', chat: '#D4A574', wall: '#7A9EC8', mailbox: '#C8B070',
  nde: '#B07070', history: '#9C9CA0', character: '#8B7BC7', admin: '#5EA89B',
}
const color = (mod) => moduleColors[mod] || '#B0B0A0'
</script>

<template>
  <div class="data-panel" data-testid="analytics-panel">
    <header class="panel-header">
      <h2 class="panel-title">学院数据</h2>
      <div class="panel-controls">
        <label class="days-label" for="days-select">时间范围</label>
        <select id="days-select" v-model="days" class="days-select" data-testid="analytics-days" @change="loadData">
          <option v-for="d in DAYS_OPTIONS" :key="d" :value="d">{{ d === 365 ? '全部' : `近 ${d} 天` }}</option>
        </select>
        <button class="refresh-btn" data-testid="analytics-refresh" @click="loadData">刷新</button>
      </div>
    </header>

    <div v-if="loading" class="loading-hint">数据加载中…</div>

    <div v-else-if="error" class="error-hint">{{ error }}</div>

    <div v-else-if="!data || data.modules.length === 0" class="empty-hint">
      <p>暂无访问数据</p>
      <p class="hint">各模块使用记录会随你浏览自动采集，刷新页面后即可看到</p>
    </div>

    <div v-else class="data-body">
      <!-- 概要统计 -->
      <section class="summary-cards" data-testid="analytics-summary-cards">
        <div class="summary-card">
          <div class="summary-num">{{ data.totalVisits }}</div>
          <div class="summary-label">总访问次数</div>
        </div>
        <div class="summary-card">
          <div class="summary-num">{{ data.modules.length }}</div>
          <div class="summary-label">活跃模块数</div>
        </div>
        <div class="summary-card">
          <div class="summary-num">{{ days === 365 ? '全部' : days + '天' }}</div>
          <div class="summary-label">统计范围</div>
        </div>
      </section>

      <!-- 使用频率（横向条形图） -->
      <section class="chart-section" data-testid="analytics-frequency">
        <h3 class="section-title">使用频率</h3>
        <p class="section-sub">各模块访问次数（按多至少）</p>
        <div class="bar-list">
          <div v-for="m in data.modules" :key="m.module" class="bar-row">
            <div class="bar-label">{{ m.label }}</div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: (m.visits / maxVisits * 100) + '%', background: color(m.module) }">
                <span class="bar-value">{{ m.visits }}</span>
              </div>
            </div>
            <div class="bar-meta">{{ m.uniqueUsers }} 人</div>
          </div>
        </div>
      </section>

      <!-- 停留时间 -->
      <section class="chart-section" data-testid="analytics-duration">
        <h3 class="section-title">平均停留时间</h3>
        <p class="section-sub">各模块每次访问的平均停留时长</p>
        <div class="bar-list">
          <div v-for="m in data.modules" :key="'d-' + m.module" class="bar-row">
            <div class="bar-label">{{ m.label }}</div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: ((m.avgSec || 0) / maxAvgSec * 100) + '%', background: color(m.module) }">
                <span class="bar-value">{{ formatDuration(m.avgSec) }}</span>
              </div>
            </div>
            <div class="bar-meta">最近 {{ formatTime(m.lastVisit) }}</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.data-panel {
  display: flex;
  flex-direction: column;
  gap: var(--md-sp-3, 12px);
  padding: var(--md-sp-3, 12px) var(--md-sp-4, 16px);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--md-sp-2, 8px);
}

.panel-title {
  font-size: var(--md-fs-lg, 18px);
  font-weight: 700;
  color: var(--md-text, #333);
  margin: 0;
}

.panel-controls {
  display: flex;
  align-items: center;
  gap: var(--md-sp-2, 8px);
}

.days-label {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-secondary, #888);
}

.days-select {
  padding: 4px 8px;
  border: 1px solid var(--md-border, #ddd);
  border-radius: var(--md-radius-sm, 4px);
  background: var(--md-bg, #fff);
  color: var(--md-text, #333);
  font-size: var(--md-fs-sm, 13px);
}

.refresh-btn {
  padding: 4px 12px;
  border: 1px solid var(--md-border, #ddd);
  border-radius: var(--md-radius-sm, 4px);
  background: var(--md-bg, #fff);
  color: var(--md-text, #333);
  font-size: var(--md-fs-sm, 13px);
  cursor: pointer;
}

.refresh-btn:hover {
  border-color: var(--md-primary, #A8C5A0);
  color: var(--md-primary, #A8C5A0);
}

.loading-hint,
.error-hint,
.empty-hint {
  padding: var(--md-sp-5, 24px);
  text-align: center;
  color: var(--md-text-secondary, #888);
  font-size: var(--md-fs-sm, 13px);
}

.error-hint {
  color: var(--md-danger, #c04040);
}

.empty-hint .hint {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-disabled, #aaa);
  margin-top: var(--md-sp-2, 8px);
}

/* 概要统计卡 */
.summary-cards {
  display: flex;
  gap: var(--md-sp-3, 12px);
  flex-wrap: wrap;
}

.summary-card {
  flex: 1;
  min-width: 120px;
  padding: var(--md-sp-3, 12px) var(--md-sp-4, 16px);
  background: var(--md-bg-card, #fff);
  border: 1px solid var(--md-border, #e5e3dd);
  border-radius: var(--md-radius, 8px);
  text-align: center;
}

.summary-num {
  font-size: var(--md-fs-2xl, 22px);
  font-weight: 700;
  color: var(--md-primary, #A8C5A0);
}

.summary-label {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-secondary, #888);
  margin-top: 2px;
}

/* 图表区 */
.chart-section {
  background: var(--md-bg-card, #fff);
  border: 1px solid var(--md-border, #e5e3dd);
  border-radius: var(--md-radius, 8px);
  padding: var(--md-sp-3, 12px) var(--md-sp-4, 16px);
}

.section-title {
  font-size: var(--md-fs-md, 14px);
  font-weight: 600;
  color: var(--md-text, #333);
  margin: 0 0 2px;
}

.section-sub {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-secondary, #888);
  margin: 0 0 var(--md-sp-3, 12px);
}

/* 横向条形 */
.bar-list {
  display: flex;
  flex-direction: column;
  gap: var(--md-sp-2, 8px);
}

.bar-row {
  display: flex;
  align-items: center;
  gap: var(--md-sp-2, 8px);
}

.bar-label {
  width: 80px;
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text, #333);
  font-weight: 600;
  flex-shrink: 0;
  text-align: right;
}

.bar-track {
  flex: 1;
  height: 24px;
  background: var(--md-bg-soft, #f0efe9);
  border-radius: var(--md-radius-sm, 4px);
  overflow: hidden;
  min-width: 120px;
}

.bar-fill {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-radius: var(--md-radius-sm, 4px);
  transition: width 0.4s var(--md-ease-out, ease-out);
  min-width: 36px;
}

.bar-value {
  font-size: var(--md-fs-xs, 12px);
  color: #fff;
  font-weight: 700;
  white-space: nowrap;
}

.bar-meta {
  width: 80px;
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-secondary, #888);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .bar-label {
    width: 60px;
  }
  .bar-meta {
    width: 60px;
    font-size: 10px;
  }
}
</style>
