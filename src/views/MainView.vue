<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getAnnouncement } from '../api/announcement'
import { getDbInfo } from '../api/dbInfo'
import TopBar from '../components/TopBar.vue'
import VersionHistoryDialog from '../components/VersionHistoryDialog.vue'
import AppFooter from '../components/AppFooter.vue'
import WordCloud from '../components/WordCloud.vue'
import FortuneCard from '../components/FortuneCard.vue'
import { Bell } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()

// 减少动效偏好：命中时所有入场动画直接落位（数字直显、打字机只显示首句）
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ===== Top5 头像：/man 下只有 6 位成员的照片目录（拼音目录名对应真名），其余用首字色块兜底 =====
const memberAvatars = {
  '陈楠': '/man/ChenNan/2d9db89061e56d79ef0c56f4e34b57cb.jpg',
  '陈睿': '/man/ChenRui/11ef79253669245665c9e8c922925c8e.jpg',
  '马逸杰': '/man/MaYijie/5ed90fe2c1ed2978db2069c91cd82f14.jpg',
  '丘序明': '/man/QiuXuming/0d5c58709647eb32cf3ce8b12655751f.jpg',
  '王乐添': '/man/WangLetian/abd0b6c3290107bd4baab4dc2213d989.jpg',
  '张迅': '/man/ZhangXun/50d02e8bc030f911f7b5bd337c52e726.jpg',
}

function avatarOf(name) {
  return memberAvatars[name] || ''
}

function initialOf(name) {
  return (name || '?').charAt(0)
}

// 首字色块底色：按名字稳定生成（与 UserAvatar 同策略）
function avatarBg(name) {
  const colors = ['#3c8cff', '#00c853', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#ff5722', '#795548']
  const s = name || 'x'
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// ===== 公告 =====
const announcement = ref('')
const annVersion = ref('')
const annDate = ref('')
const annUpdatedAt = ref('')
const showVersionHistory = ref(false)

// ===== 群聊数据看板（真实统计，非编造数字） =====
const stats = ref(null)
const statsLoading = ref(true)
const statsError = ref(false)

onMounted(async () => {
  await auth.fetchMe()
  fetchAnnouncement()
  loadStats()
})

async function fetchAnnouncement() {
  try {
    const res = await getAnnouncement()
    announcement.value = res.data.summary || res.data.content || ''
    annVersion.value = res.data.version || ''
    annDate.value = res.data.date || ''
    annUpdatedAt.value = res.data.updatedAt || ''
  } catch {
    announcement.value = '加载失败'
  }
}

async function loadStats() {
  statsLoading.value = true
  statsError.value = false
  try {
    const res = await getDbInfo()
    stats.value = res.data
    startCountUp()
  } catch {
    stats.value = null
    statsError.value = true
  } finally {
    statsLoading.value = false
  }
}

// ===== 数字滚动（入场时从 0 滚到真实值，reduce-motion 时直显） =====
const displayNums = reactive({ total: 0, speakers: 0 })
const rankNums = reactive({}) // 排行计数按 key 'r<i>' 滚动
let animFrames = []

function animateTo(key, to, dur, store) {
  const from = store[key] || 0
  if (reduceMotion || from === to) {
    store[key] = to
    return
  }
  const start = performance.now()
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur)
    const eased = 1 - Math.pow(1 - p, 3)
    store[key] = Math.round(from + (to - from) * eased)
    if (p < 1) animFrames.push(requestAnimationFrame(step))
  }
  animFrames.push(requestAnimationFrame(step))
}

function startCountUp() {
  animFrames.forEach(cancelAnimationFrame)
  animFrames = []
  animateTo('total', Number(stats.value?.overview?.total) || 0, 1100, displayNums)
  animateTo('speakers', Number(stats.value?.speakerCount?.cnt) || 0, 900, displayNums)
  ;(topFive.value || []).forEach((m, i) => {
    animateTo('r' + i, Number(m.cnt) || 0, 900 + i * 130, rankNums)
  })
}

onBeforeUnmount(() => animFrames.forEach(cancelAnimationFrame))

// ===== 示例提问打字机（中气泡循环逐字打出） =====
const sampleTexts = ['「7 月份聊了什么？」', '「谁发言最多？」', '「蛋哥说过什么？」', '「体委又吹了什么牛？」']
const typedText = ref('')
let typeTimer = 0
let typeIdx = 0

function typeLoop() {
  const full = sampleTexts[typeIdx % sampleTexts.length]
  typedText.value = ''
  let charIdx = 0
  clearInterval(typeTimer)
  typeTimer = setInterval(() => {
    charIdx++
    typedText.value = full.slice(0, charIdx)
    if (charIdx >= full.length) {
      clearInterval(typeTimer)
      typeTimer = setTimeout(() => {
        typeIdx++
        typeLoop()
      }, 2200)
    }
  }, 90)
}

if (reduceMotion) {
  typedText.value = sampleTexts[0]
} else {
  typeLoop()
}

onBeforeUnmount(() => {
  clearInterval(typeTimer)
  clearTimeout(typeTimer)
})

// ===== 公告未读红点：版本号 vs localStorage 已读版本 =====
const annSeenVersion = ref(localStorage.getItem('nde-ann-seen') || '')
const annUnread = computed(() => !!annVersion.value && annVersion.value !== annSeenVersion.value)

function openHistory() {
  if (annVersion.value) {
    localStorage.setItem('nde-ann-seen', annVersion.value)
    annSeenVersion.value = annVersion.value
  }
  showVersionHistory.value = true
}

const topFive = computed(() => (stats.value?.topMembers || []).slice(0, 5))
const maxTop = computed(() => topFive.value[0]?.cnt || 1)
const yearly = computed(() => {
  // 年度分布：取最近 6 年，避免老数据挤压版面
  const all = stats.value?.yearlyStats || []
  return all.slice(-6)
})
const maxYear = computed(() => Math.max(...yearly.value.map((y) => Number(y.cnt) || 0), 1))
const timeSpan = computed(() => {
  const o = stats.value?.overview
  if (!o?.earliest || !o?.latest) return '—'
  const fmt = (ms) => {
    const d = new Date(Number(ms))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return `${fmt(o.earliest)} ~ ${fmt(o.latest)}`
})

function fmtCount(n) {
  return Number(n || 0).toLocaleString('zh-CN')
}

function rankPct(cnt) {
  return Math.max(2, Math.round((Number(cnt) / maxTop.value) * 100)) + '%'
}

function yearPct(cnt) {
  return Math.max(2, Math.round((Number(cnt) / maxYear.value) * 100)) + '%'
}
</script>

<template>
  <div class="main-page">
    <!-- 顶部导航 -->
    <TopBar />

    <!-- 大厅门户 -->
    <div class="main-container">
      <div class="hall-grid">
        <!-- 男德通主视觉大卡（主推线） -->
        <section class="hall-card hero-card">
          <div class="hero-text">
            <p class="hero-eyebrow">AI 群聊助手 · 在线</p>
            <h2 class="hero-title">男德通</h2>
            <p class="hero-desc">群聊里的任何事都可以问它——谁最活跃、什么时候聊过什么、某个人说过哪些话。</p>
            <button class="hero-cta" @click="router.push('/chat')">去找男德通聊聊</button>
          </div>
          <div class="hero-samples" aria-hidden="true">
            <span class="sample-chip s1">「7 月份聊了什么？」</span>
            <span class="sample-chip s2 typing-chip">{{ typedText }}<span class="type-cursor" aria-hidden="true">|</span></span>
            <span class="sample-chip s3">「蛋哥说过什么？」</span>
          </div>
        </section>

        <!-- 群聊数据看板 -->
        <section class="hall-card stats-card">
          <div class="card-head">
            <h3 class="card-title">群聊数据看板</h3>
            <span class="card-sub">真实统计</span>
          </div>

          <div v-if="statsLoading" class="stats-state">正在翻群聊记录…</div>
          <div v-else-if="statsError" class="stats-state">
            <p class="stats-error-text">统计暂不可用</p>
            <button class="retry-btn" @click="loadStats">重试</button>
          </div>
          <div v-else-if="stats" class="stats-body">
            <div class="stat-trio">
              <div class="stat-item">
                <span class="stat-num">{{ fmtCount(displayNums.total) }}</span>
                <span class="stat-label">条消息</span>
              </div>
              <div class="stat-item">
                <span class="stat-num stat-num-sm">{{ timeSpan }}</span>
                <span class="stat-label">时间跨度</span>
              </div>
              <div class="stat-item">
                <span class="stat-num">{{ displayNums.speakers }}</span>
                <span class="stat-label">人参与发言</span>
              </div>
            </div>

            <h4 class="mini-title">发言排行 Top 5</h4>
            <ol class="rank-list">
              <li v-for="(m, i) in topFive" :key="m.nickname" class="rank-row">
                <span class="rank-no" :class="{ ['medal-' + (i + 1)]: i < 3 }">{{ i + 1 }}</span>
                <span class="rank-avatar">
                  <img v-if="avatarOf(m.nickname)" :src="avatarOf(m.nickname)" :alt="m.nickname" loading="lazy" />
                  <span v-else class="rank-avatar-fallback" :style="{ background: avatarBg(m.nickname) }">{{ initialOf(m.nickname) }}</span>
                </span>
                <span class="rank-name">{{ m.nickname }}</span>
                <span class="rank-bar"><span class="rank-fill" :class="'fill-' + (i % 5)" :style="{ width: rankPct(m.cnt) }"></span></span>
                <span class="rank-cnt">{{ fmtCount(rankNums['r' + i] ?? 0) }}</span>
              </li>
            </ol>

            <h4 class="mini-title">年度分布</h4>
            <div class="year-list">
              <div v-for="y in yearly" :key="y.year" class="year-row">
                <span class="year-name">{{ y.year }}</span>
                <span class="rank-bar"><span class="rank-fill fill-accent" :style="{ width: yearPct(y.cnt) }"></span></span>
                <span class="rank-cnt">{{ fmtCount(y.cnt) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 师德墙入口 -->
        <button class="hall-card entry-card wall-card" @click="router.push('/wall')">
          <span class="entry-icon">墙</span>
          <h3 class="entry-title">师德墙</h3>
          <p class="entry-desc">看看大家都在挂什么，点赞评论走一波。</p>
          <span class="entry-arrow" aria-hidden="true">→</span>
        </button>

        <!-- 院长信箱入口 -->
        <button class="hall-card entry-card mailbox-card" @click="router.push('/mailbox')">
          <span class="entry-icon">箱</span>
          <h3 class="entry-title">院长信箱</h3>
          <p class="entry-desc">提意见、报 BUG、催更新，院长亲自批阅。</p>
          <span class="entry-arrow" aria-hidden="true">→</span>
        </button>

        <!-- 公告 -->
        <section class="hall-card ann-card">
          <div class="ann-header">
            <span class="ann-title">
              <Bell :size="16" style="vertical-align:-2px" :class="{ 'bell-wiggle': annUnread }" /> 公告
              <span v-if="annUnread" class="ann-dot" title="有新公告"></span>
            </span>
            <button class="ann-history-btn" @click="openHistory">版本历史</button>
          </div>
          <div class="ann-body">
            <div v-if="annVersion" class="ann-version-row">
              <span class="ann-badge">{{ annVersion }}</span>
              <span v-if="annDate" class="ann-date">{{ new Date(annDate).toLocaleDateString('zh-CN') }}</span>
            </div>
            <p class="ann-content">{{ announcement }}</p>
            <span v-if="annUpdatedAt" class="ann-time">更新于 {{ new Date(annUpdatedAt).toLocaleString('zh-CN') }}</span>
          </div>
        </section>

        <!-- 群聊高频词云 + 星河问（今日运势/星座分析） -->
        <div class="hall-card wc-card">
          <WordCloud :total="stats?.overview?.total || 0" />
        </div>
        <FortuneCard />
      </div>
    </div>

    <AppFooter />

    <!-- 版本历史弹窗 -->
    <VersionHistoryDialog :show="showVersionHistory" @close="showVersionHistory = false" @updated="fetchAnnouncement" />
  </div>
</template>

<style scoped>
.main-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 内容区：门户加宽（原 800px 窄版改为大厅网格） */
.main-container {
  flex: 1;
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 16px;
}

/* ===== 大厅网格（12 列 Bento，非对称节奏） ===== */
.hall-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 20px;
}

.hall-card {
  background-color: var(--md-bg-card);
  background-image: var(--md-paper-grain);
  border-radius: var(--md-radius-lg);
  border: 1px solid var(--md-border);
  box-shadow: var(--md-shadow-card);
  padding: 24px;
  transition: box-shadow 0.3s var(--md-ease-out), border-color 0.3s var(--md-ease-out);
}

.hero-card { grid-column: span 7; }
.stats-card { grid-column: span 5; }
.wall-card { grid-column: span 4; }
.mailbox-card { grid-column: span 4; }
.ann-card { grid-column: span 4; padding: 0; overflow: hidden; }
.wc-card { grid-column: span 8; }

/* ===== 男德通主视觉大卡 ===== */
.hero-card {
  display: flex;
  align-items: center;
  gap: 24px;
  background-image: var(--md-paper-grain), var(--md-hall-hero-bg);
  position: relative;
  overflow: hidden;
}

.hero-text {
  flex: 1 1 60%;
  min-width: 0;
}

.hero-eyebrow {
  font-family: var(--md-font-body);
  font-size: 13px;
  letter-spacing: 0.14em;
  color: var(--md-primary-hover);
  margin: 0 0 8px;
}

.hero-title {
  font-family: var(--md-font-display);
  font-size: clamp(2rem, 4vw, 2.6rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--md-text);
  margin: 0 0 12px;
  line-height: 1.15;
}

.hero-desc {
  font-family: var(--md-font-body);
  font-size: 14px;
  line-height: 1.8;
  color: var(--md-text-secondary);
  margin: 0 0 20px;
  max-width: 30em;
}

.hero-cta {
  font-family: var(--md-font-body);
  font-size: 15px;
  letter-spacing: 0.08em;
  color: var(--md-text-on-primary);
  background: var(--md-primary);
  border: none;
  border-radius: var(--md-radius);
  padding: 10px 28px;
  cursor: pointer;
  transition: background-color 0.2s var(--md-ease-out), transform 0.2s var(--md-ease-out);
}

.hero-cta:hover {
  background: var(--md-primary-hover);
  transform: translateY(-1px);
}

.hero-cta:focus-visible {
  outline: 2px solid var(--md-primary-hover);
  outline-offset: 2px;
}

/* 示例提问：像气泡一样浮在右侧，展示真实能力 */
.hero-samples {
  flex: 0 1 40%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

.sample-chip {
  font-family: var(--md-font-body);
  font-size: 13px;
  color: var(--md-text);
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius);
  padding: 8px 14px;
  box-shadow: var(--md-shadow-sm);
}

.sample-chip.s1 { transform: rotate(-1.5deg); background: var(--md-primary-bg); border-color: transparent; }
.sample-chip.s2 { transform: rotate(1deg); }
.sample-chip.s3 { transform: rotate(-0.5deg); background: var(--md-secondary-bg); border-color: transparent; }

/* 打字机气泡：光标闪烁提示"正在输入" */
.typing-chip {
  min-width: 150px;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
}

.type-cursor {
  display: inline-block;
  margin-left: 2px;
  color: var(--md-primary);
  animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ===== 数据看板 ===== */
.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-title {
  font-family: var(--md-font-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--md-text);
  margin: 0;
}

.card-sub {
  font-size: 12px;
  color: var(--md-text-secondary);
}

.stats-state {
  font-family: var(--md-font-body);
  font-size: 14px;
  color: var(--md-text-secondary);
  padding: 32px 0;
  text-align: center;
}

.stats-error-text {
  margin: 0 0 12px;
}

.retry-btn {
  font-family: var(--md-font-body);
  font-size: 13px;
  color: var(--md-primary-hover);
  background: var(--md-primary-bg);
  border: none;
  border-radius: var(--md-radius-sm);
  padding: 6px 18px;
  cursor: pointer;
  transition: background-color 0.2s var(--md-ease-out);
}

.retry-btn:hover {
  background: var(--md-bg-soft);
}

.stat-trio {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  flex: 1;
  min-width: 0;
  background: var(--md-bg-soft);
  border-radius: var(--md-radius);
  padding: 12px 10px;
  text-align: center;
}

.stat-num {
  display: block;
  font-family: var(--md-font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--md-primary-hover);
  line-height: 1.2;
  overflow-wrap: anywhere;
  min-width: 0;
}

.stat-num-sm {
  font-size: 14px;
  padding-top: 6px;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: var(--md-text-secondary);
  margin-top: 4px;
}

.mini-title {
  font-family: var(--md-font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--md-text);
  margin: 0 0 10px;
}

.rank-list {
  list-style: none;
  margin: 0 0 20px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rank-no {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--md-font-display);
  font-size: 12px;
  color: var(--md-text-disabled);
  text-align: center;
}

/* 前三名金银铜奖牌 */
.rank-no.medal-1,
.rank-no.medal-2,
.rank-no.medal-3 {
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  font-size: 11px;
}
.rank-no.medal-1 { background: linear-gradient(135deg, #F2CE6A, #D9A63C); }
.rank-no.medal-2 { background: linear-gradient(135deg, #DDE3E8, #A9B3BD); }
.rank-no.medal-3 { background: linear-gradient(135deg, #D8A476, #B0784A); }

/* 排行头像：照片优先，无照片用首字色块 */
.rank-avatar {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--md-border);
  background: var(--md-bg-soft);
}
.rank-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.rank-avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
}

.rank-name {
  flex: 0 0 56px;
  font-size: 13px;
  color: var(--md-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-bar {
  flex: 1;
  min-width: 0;
  height: 10px;
  background: var(--md-bg-soft);
  border-radius: var(--md-radius-full);
  overflow: hidden;
}

.rank-fill {
  display: block;
  height: 100%;
  border-radius: var(--md-radius-full);
  transition: width 0.6s var(--md-ease-out);
}

.fill-0 { background: var(--md-primary); }
.fill-1 { background: var(--md-secondary); }
.fill-2 { background: var(--md-accent); }
.fill-3 { background: var(--md-danger); }
.fill-4 { background: var(--md-info); }
.fill-accent { background: var(--md-accent); }

.rank-cnt {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--md-text-secondary);
  font-variant-numeric: tabular-nums;
}

.year-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.year-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.year-name {
  flex: 0 0 42px;
  font-size: 13px;
  color: var(--md-text);
  font-variant-numeric: tabular-nums;
}

/* ===== 入口卡 ===== */
.entry-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  font-family: var(--md-font-body);
  color: var(--md-text);
  cursor: pointer;
  position: relative;
  min-height: 150px;
  transition: box-shadow 0.3s var(--md-ease-out), border-color 0.3s var(--md-ease-out), transform 0.3s var(--md-ease-out);
}

.entry-card:hover {
  box-shadow: var(--md-shadow-card-lift);
  border-color: var(--md-primary);
  transform: translateY(-3px) rotate(-0.4deg);
}

.entry-card:focus-visible {
  outline: 2px solid var(--md-primary-hover);
  outline-offset: 2px;
}

.entry-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-family: var(--md-font-display);
  font-size: 17px;
  color: var(--md-primary);
  background: var(--md-primary-bg);
  border-radius: var(--md-radius-sm);
  margin-bottom: 12px;
}

.entry-title {
  font-family: var(--md-font-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--md-text);
  margin: 0 0 8px;
}

.entry-desc {
  font-size: 13px;
  line-height: 1.7;
  color: var(--md-text-secondary);
  margin: 0;
}

.entry-arrow {
  position: absolute;
  right: 20px;
  bottom: 18px;
  font-size: 16px;
  color: var(--md-text-disabled);
  transition: color 0.2s var(--md-ease-out), transform 0.2s var(--md-ease-out);
}

.entry-card:hover .entry-arrow {
  color: var(--md-primary);
  transform: translateX(3px);
}

/* ===== 公告卡 ===== */
.ann-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--md-divider);
}

.ann-title {
  position: relative;
  display: inline-flex;
  align-items: center;
  font-family: var(--md-font-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--md-text);
}

/* 未读红点 */
.ann-dot {
  width: 8px;
  height: 8px;
  margin-left: 8px;
  border-radius: 50%;
  background: var(--md-danger);
  animation: dot-pulse 2s var(--md-ease-out) infinite;
}

@keyframes dot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(201, 160, 160, 0.5); }
  50% { box-shadow: 0 0 0 4px rgba(201, 160, 160, 0); }
}

/* 未读时铃铛轻摇两下 */
.bell-wiggle {
  animation: bell-wiggle 1.6s var(--md-ease-out) 2;
  transform-origin: top center;
}

@keyframes bell-wiggle {
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(14deg); }
  40% { transform: rotate(-12deg); }
  60% { transform: rotate(8deg); }
  80% { transform: rotate(-6deg); }
}

.ann-history-btn {
  background: none;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  padding: 4px 12px;
  font-size: 13px;
  color: var(--md-text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.ann-history-btn:hover {
  border-color: var(--md-primary);
  color: var(--md-primary);
}

.ann-body {
  padding: 20px;
}

.ann-version-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.ann-badge {
  font-size: 13px;
  font-weight: 600;
  color: var(--md-primary);
  background: var(--md-primary-bg);
  padding: 2px 10px;
  border-radius: var(--md-radius-full);
}

.ann-date {
  font-size: 12px;
  color: var(--md-text-secondary);
}

.ann-content {
  font-size: 14px;
  line-height: 1.75;
  color: var(--md-text);
  margin: 0 0 12px;
  white-space: pre-wrap;
}

.ann-time {
  font-size: 12px;
  color: var(--md-text-secondary);
}

/* ===== 词云卡（去除组件自带外边距） ===== */
.wc-card {
  padding: 0;
}

.wc-card :deep(.wordcloud-card) {
  margin-bottom: 0;
  border: none;
  box-shadow: none;
  background: transparent;
}

/* ===== 响应式 ===== */
@media (max-width: 1023px) {
  .hero-card,
  .stats-card { grid-column: span 12; }
  .wall-card,
  .mailbox-card { grid-column: span 6; }
  .ann-card { grid-column: span 12; }
  .wc-card,
  .fortune-card { grid-column: span 12; }
}

@media (max-width: 639px) {
  .hall-grid { gap: 14px; }
  .hero-card { flex-direction: column; align-items: stretch; }
  .hero-samples { align-items: flex-start; }
  .sample-chip.s1,
  .sample-chip.s2,
  .sample-chip.s3 { transform: none; }
  .wall-card,
  .mailbox-card { grid-column: span 12; }
  .rank-name { flex-basis: 48px; }
}
</style>
