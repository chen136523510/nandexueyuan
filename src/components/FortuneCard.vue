<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { ZODIACS, zodiacFromMonthDay, getPersonalFortune, getZodiacToday } from '../utils/fortune'

const auth = useAuthStore()

// ===== 视图切换 =====
const tab = ref('fortune') // fortune = 今日运势 | zodiac = 星座分析

// ===== 个人运势（seed = 用户 id，每人每天一份且恒定） =====
const fortune = computed(() => getPersonalFortune(auth.user?.id || auth.user?.username || 'guest'))

// ===== 生日登记（localStorage 轻量持久化，不动后端） =====
const BIRTH_KEY = 'nde-birth-md'
const birthMd = ref(localStorage.getItem(BIRTH_KEY) || '')
const showBirthForm = ref(false)
const birthMonth = ref('')
const birthDay = ref('')

function openBirthForm() {
  const [m, d] = (birthMd.value || '').split('-')
  birthMonth.value = m || ''
  birthDay.value = d || ''
  showBirthForm.value = true
}

function saveBirth() {
  const m = Number(birthMonth.value)
  const d = Number(birthDay.value)
  if (zodiacFromMonthDay(m, d) < 0) return
  birthMd.value = `${m}-${d}`
  localStorage.setItem(BIRTH_KEY, birthMd.value)
  showBirthForm.value = false
  if (viewZodiac.value < 0) viewZodiac.value = zodiacFromMonthDay(m, d)
}

function clearBirth() {
  birthMd.value = ''
  localStorage.removeItem(BIRTH_KEY)
  showBirthForm.value = false
}

const birthZodiacIdx = computed(() => {
  if (!birthMd.value) return -1
  const [m, d] = birthMd.value.split('-').map(Number)
  return zodiacFromMonthDay(m, d)
})

// ===== 星座分析：viewZodiac = 正在看哪个星座（默认跟随生日） =====
const viewZodiac = ref(birthZodiacIdx.value)
const zodiacToday = computed(() => (viewZodiac.value >= 0 ? getZodiacToday(viewZodiac.value) : null))
const zodiacInfo = computed(() => (viewZodiac.value >= 0 ? ZODIACS[viewZodiac.value] : null))

function pickZodiac(i) {
  viewZodiac.value = i
}

// ===== 星级展示 =====
function starChars(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}
</script>

<template>
  <section class="hall-card fortune-card">
    <div class="card-head">
      <h3 class="card-title">星河问签</h3>
      <span class="card-sub">仅供娱乐 · 每日零点换签</span>
    </div>

    <!-- tab 切换 -->
    <div class="ft-tabs" role="tablist">
      <button
        class="ft-tab"
        :class="{ active: tab === 'fortune' }"
        role="tab"
        :aria-selected="tab === 'fortune'"
        @click="tab = 'fortune'"
      >今日运势</button>
      <button
        class="ft-tab"
        :class="{ active: tab === 'zodiac' }"
        role="tab"
        :aria-selected="tab === 'zodiac'"
        @click="tab = 'zodiac'"
      >星座分析</button>
    </div>

    <!-- ===== 今日运势 ===== -->
    <div v-if="tab === 'fortune'" class="ft-body">
      <div class="ft-stars-row">
        <span class="ft-stars" :aria-label="`今日运势 ${fortune.stars} 星（满分5星）`">{{ starChars(fortune.stars) }}</span>
        <span class="ft-date">{{ fortune.date }}</span>
      </div>

      <div class="ft-yiji">
        <p class="ft-yi"><span class="ft-tag">宜</span>{{ fortune.yi.join('、') }}</p>
        <p class="ft-ji"><span class="ft-tag ft-tag-ji">忌</span>{{ fortune.ji.join('、') }}</p>
      </div>

      <div class="ft-lucky-row">
        <span class="ft-lucky">幸运数字 <b>{{ fortune.luckyNumber }}</b></span>
        <span class="ft-lucky">
          幸运色
          <span class="ft-color-dot" :style="{ background: fortune.luckyColor.hex }" aria-hidden="true"></span>
          <b>{{ fortune.luckyColor.name }}</b>
        </span>
      </div>

      <div class="ft-bars">
        <div v-for="l in fortune.lucks" :key="l.label" class="ft-bar-row">
          <span class="ft-bar-label">{{ l.label }}</span>
          <span class="ft-bar-track"><span class="ft-bar-fill" :style="{ width: l.value + '%' }"></span></span>
          <span class="ft-bar-num">{{ l.value }}</span>
        </div>
      </div>

      <p class="ft-verse">「{{ fortune.verse }}」</p>
    </div>

    <!-- ===== 星座分析 ===== -->
    <div v-else class="ft-body">
      <!-- 12 星座选择 -->
      <div class="ft-zodiac-picker">
        <button
          v-for="(z, i) in ZODIACS"
          :key="z.name"
          class="ft-zodiac-btn"
          :class="{ active: viewZodiac === i, mine: birthZodiacIdx === i }"
          :aria-label="`${z.name}${birthZodiacIdx === i ? '（我的星座）' : ''}`"
          :title="z.name"
          @click="pickZodiac(i)"
        >{{ z.icon }}</button>
      </div>

      <template v-if="zodiacInfo">
        <div class="ft-zodiac-head">
          <span class="ft-zodiac-icon">{{ zodiacInfo.icon }}</span>
          <div class="ft-zodiac-meta">
            <span class="ft-zodiac-name">{{ zodiacInfo.name }}<b v-if="birthZodiacIdx === viewZodiac" class="ft-mine-badge">我的</b></span>
            <span class="ft-zodiac-range">{{ zodiacInfo.range }}</span>
          </div>
          <span class="ft-mood" :class="{ good: zodiacToday.overall >= 75 }">{{ zodiacToday.moodWord }}</span>
        </div>

        <div class="ft-bars">
          <div class="ft-bar-row">
            <span class="ft-bar-label">综合</span>
            <span class="ft-bar-track"><span class="ft-bar-fill ft-fill-main" :style="{ width: zodiacToday.overall + '%' }"></span></span>
            <span class="ft-bar-num">{{ zodiacToday.overall }}</span>
          </div>
          <div v-for="l in zodiacToday.lucks" :key="l.label" class="ft-bar-row">
            <span class="ft-bar-label">{{ l.label }}</span>
            <span class="ft-bar-track"><span class="ft-bar-fill" :style="{ width: l.value + '%' }"></span></span>
            <span class="ft-bar-num">{{ l.value }}</span>
          </div>
        </div>

        <p class="ft-blurb">{{ zodiacInfo.blurb }}</p>
      </template>

      <!-- 生日登记 -->
      <button v-if="!showBirthForm" class="ft-birth-btn" @click="openBirthForm">
        {{ birthMd ? `我的生日：${birthMd.replace('-', ' 月 ') + ' 日'}` : '🍰 登记生日，解锁本命星座' }}
      </button>
      <div v-else class="ft-birth-form">
        <select v-model="birthMonth" class="ft-birth-select" aria-label="出生月份">
          <option value="" disabled>月</option>
          <option v-for="m in 12" :key="m" :value="String(m)">{{ m }}月</option>
        </select>
        <select v-model="birthDay" class="ft-birth-select" aria-label="出生日期">
          <option value="" disabled>日</option>
          <option v-for="d in 31" :key="d" :value="String(d)">{{ d }}日</option>
        </select>
        <button class="ft-birth-save" :disabled="!birthMonth || !birthDay" @click="saveBirth">保存</button>
        <button class="ft-birth-clear" v-if="birthMd" aria-label="清除生日登记" title="清除" @click="clearBirth">✕</button>
        <button class="ft-birth-cancel" v-else aria-label="取消登记" @click="showBirthForm = false">取消</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fortune-card {
  grid-column: span 4;
  display: flex;
  flex-direction: column;
}

.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}

.card-title {
  font-family: var(--md-font-display);
  font-size: 1.15rem;
  color: var(--md-text);
  margin: 0;
  font-weight: 600;
}

.card-sub {
  font-size: 0.75rem;
  color: var(--md-text-disabled);
}

/* tab */
.ft-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}

.ft-tab {
  flex: 1;
  padding: 6px 0;
  font-family: var(--md-font-body);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  color: var(--md-text-secondary);
  background: var(--md-primary-bg);
  border: 1px solid transparent;
  border-radius: var(--md-radius-sm);
  cursor: pointer;
  transition: color 0.2s var(--md-ease-out), border-color 0.2s var(--md-ease-out);
}

.ft-tab.active {
  color: var(--md-primary-hover);
  border-color: var(--md-primary);
  background: transparent;
}

.ft-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 星级行 */
.ft-stars-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.ft-stars {
  color: var(--md-primary-hover);
  letter-spacing: 0.15em;
  font-size: 1.05rem;
}

.ft-date {
  font-size: 0.75rem;
  color: var(--md-text-disabled);
}

/* 宜忌 */
.ft-yiji {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ft-yi,
.ft-ji {
  margin: 0;
  font-size: 0.88rem;
  color: var(--md-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.ft-tag {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--md-font-display);
  font-size: 0.8rem;
  color: var(--md-text-on-primary);
  background: var(--md-primary);
  border-radius: var(--md-radius-sm);
}

.ft-tag-ji {
  background: var(--md-danger, #b3564e);
}

/* 幸运行 */
.ft-lucky-row {
  display: flex;
  gap: 18px;
  font-size: 0.82rem;
  color: var(--md-text-secondary);
}

.ft-lucky b {
  color: var(--md-text);
  font-weight: 600;
}

.ft-color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  vertical-align: -1px;
  margin: 0 2px;
  border: 1px solid var(--md-border);
}

/* 运势条 */
.ft-bars {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.ft-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ft-bar-label {
  flex-basis: 42px;
  font-size: 0.78rem;
  color: var(--md-text-secondary);
  text-align: right;
}

.ft-bar-track {
  flex: 1;
  height: 8px;
  background: var(--md-primary-bg);
  border-radius: 4px;
  overflow: hidden;
}

.ft-bar-fill {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--md-primary), var(--md-primary-hover));
}

.ft-fill-main {
  background: linear-gradient(90deg, var(--md-accent, #c8a06a), var(--md-primary-hover));
}

.ft-bar-num {
  flex-basis: 24px;
  font-size: 0.75rem;
  color: var(--md-text-disabled);
  text-align: right;
}

/* 签语 */
.ft-verse {
  margin: auto 0 0;
  padding-top: 4px;
  font-family: var(--md-font-display);
  font-size: 0.85rem;
  line-height: 1.7;
  color: var(--md-text-secondary);
  text-align: center;
}

/* ===== 星座视图 ===== */
.ft-zodiac-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ft-zodiac-btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  color: var(--md-text-secondary);
  background: transparent;
  border: 1px solid var(--md-border);
  border-radius: 50%;
  cursor: pointer;
  transition: border-color 0.2s var(--md-ease-out), background-color 0.2s var(--md-ease-out);
}

.ft-zodiac-btn:hover {
  border-color: var(--md-primary);
}

.ft-zodiac-btn.active {
  border-color: var(--md-primary);
  background: var(--md-primary-bg);
  color: var(--md-primary-hover);
}

/* 本命星座小标记 */
.ft-zodiac-btn.mine {
  position: relative;
}

.ft-zodiac-btn.mine::after {
  content: '';
  position: absolute;
  top: -1px;
  right: -1px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--md-accent, #c8a06a);
}

.ft-zodiac-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ft-zodiac-icon {
  font-size: 1.6rem;
  color: var(--md-primary);
}

.ft-zodiac-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ft-zodiac-name {
  font-family: var(--md-font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--md-text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.ft-mine-badge {
  font-size: 0.68rem;
  font-weight: 400;
  color: var(--md-text-on-primary);
  background: var(--md-accent, #c8a06a);
  padding: 1px 6px;
  border-radius: 8px;
}

.ft-zodiac-range {
  font-size: 0.72rem;
  color: var(--md-text-disabled);
}

.ft-mood {
  margin-left: auto;
  font-family: var(--md-font-display);
  font-size: 1.1rem;
  color: var(--md-text-secondary);
}

.ft-mood.good {
  color: var(--md-primary-hover);
}

.ft-blurb {
  margin: auto 0 0;
  font-size: 0.82rem;
  line-height: 1.7;
  color: var(--md-text-secondary);
  text-align: center;
}

/* 生日登记 */
.ft-birth-btn {
  margin-top: auto;
  padding: 7px 0;
  font-family: var(--md-font-body);
  font-size: 0.8rem;
  color: var(--md-text-secondary);
  background: transparent;
  border: 1px dashed var(--md-border);
  border-radius: var(--md-radius-sm);
  cursor: pointer;
  transition: border-color 0.2s var(--md-ease-out), color 0.2s var(--md-ease-out);
}

.ft-birth-btn:hover {
  border-color: var(--md-primary);
  color: var(--md-primary-hover);
}

.ft-birth-form {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ft-birth-select {
  flex: 1;
  min-width: 0;
  padding: 5px 4px;
  font-size: 0.8rem;
  color: var(--md-text);
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
}

.ft-birth-save {
  padding: 5px 10px;
  font-size: 0.8rem;
  color: var(--md-text-on-primary);
  background: var(--md-primary);
  border: none;
  border-radius: var(--md-radius-sm);
  cursor: pointer;
}

.ft-birth-save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ft-birth-clear,
.ft-birth-cancel {
  padding: 5px 8px;
  font-size: 0.78rem;
  color: var(--md-text-secondary);
  background: transparent;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  cursor: pointer;
}

/* 减少动效兜底（窄屏断点由 MainView 主网格统一控制） */
@media (prefers-reduced-motion: reduce) {
  .ft-tab,
  .ft-zodiac-btn,
  .ft-birth-btn {
    transition: none;
  }
}
</style>
