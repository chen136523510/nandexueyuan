<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useVisualNovelStore } from '../visualnovel/stores/visualNovelStore.js'
import AppFooter from '../components/AppFooter.vue'

const router = useRouter()
const auth = useAuthStore()
const vnStore = useVisualNovelStore()

// 首页后台静默预加载德塔图片（登录用户浏览首页时提前下载，进德塔秒开）
onMounted(() => {
  if (auth.isLoggedIn && !vnStore.preloaded) {
    vnStore.preloadChapterImages()
  }
})

// 彩蛋
const showEgg = ref(false)

// 敬请期待板块
const upcoming = [
  { title: '群聊数据看板', desc: '聊天统计、活跃度趋势、话痨排行榜。建设中，敬请期待。', icon: '数' },
  { title: '群友高光时刻', desc: '名场面存档，金句合集，社死瞬间永流传。建设中，敬请期待。', icon: '光' },
]
</script>

<template>
  <div class="page">
    <!-- 彩蛋：右上角露一角 -->
    <div class="easter-egg" @click="showEgg = true" title="?"></div>

    <!-- Hero：左对齐，打破居中三件套 -->
    <header class="hero">
      <div class="hero-inner">
        <h1 class="hero-title">男德学院</h1>
        <p class="hero-subtitle">修身 · 齐家 · 摸鱼 · 开摆</p>
        <div class="hero-actions">
          <template v-if="auth.isLoggedIn">
            <button class="hero-btn primary" @click="router.push('/home')">进入学院</button>
          </template>
          <template v-else>
            <button class="hero-btn primary" @click="router.push('/login')">登录</button>
            <button class="hero-btn" @click="router.push('/register')">注册</button>
          </template>
        </div>
      </div>
    </header>

    <!-- 敬请期待：非对称 editorial 节奏，打破等高卡片网格 -->
    <section class="upcoming">
      <h2 class="section-title">即将上线</h2>
      <div class="card-list">
        <article v-for="(u, i) in upcoming" :key="u.title" class="upcoming-card" :class="{ 'card-major': i === 0 }">
          <div class="card-head">
            <span class="card-icon">{{ u.icon }}</span>
            <h3 class="card-title">{{ u.title }}</h3>
          </div>
          <p class="card-desc">{{ u.desc }}</p>
          <span class="card-badge">敬请期待</span>
        </article>
      </div>
    </section>

    <AppFooter />

    <!-- 彩蛋弹窗 -->
    <Transition name="egg">
      <div v-if="showEgg" class="egg-overlay" @click="showEgg = false">
        <div class="egg-modal" @click.stop>
          <img src="/man/QiuXuming/0d5c58709647eb32cf3ce8b12655751f.jpg" alt="彩蛋" class="egg-img" />
          <p class="egg-text">恭喜找到彩蛋</p>
          <button class="egg-close" @click="showEgg = false">关闭</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 彩蛋：右上角露一角 */
.easter-egg {
  position: fixed;
  top: -80px;
  right: -80px;
  width: 160px;
  height: 160px;
  background-image: url('/man/QiuXuming/0d5c58709647eb32cf3ce8b12655751f.jpg');
  background-size: cover;
  background-position: center;
  border-radius: 50%;
  cursor: pointer;
  z-index: var(--md-z-modal);
  opacity: 0.6;
  transition: opacity 0.3s var(--md-ease-out);
}

.easter-egg:hover {
  opacity: 1;
}

/* Hero — 左对齐，打破居中三件套；莫兰迪渐变 token 化 */
.hero {
  background:
    var(--md-hero-texture),
    var(--md-hero-bg);
  background-size: 24px 24px, 100% 100%;
  color: var(--md-text);
  padding: 5rem 2rem 4.5rem;
}

.hero-inner {
  max-width: 640px;
  margin: 0 auto;
}

.hero-title {
  font-family: var(--md-font-display);
  font-size: clamp(2.8rem, 8vw, 5rem);
  font-weight: 700;
  letter-spacing: 0.04em;
  margin: 0 0 0.75rem;
  color: var(--md-text);
  line-height: 1.1;
}

.hero-subtitle {
  font-family: var(--md-font-display);
  font-size: clamp(1.1rem, 2.5vw, 1.4rem);
  letter-spacing: 0.18em;
  color: var(--md-primary-hover);
  margin: 0 0 2rem;
}

/* Hero 按钮区：左对齐 */
.hero-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.hero-btn {
  padding: 0.6rem 1.75rem;
  font-family: var(--md-font-body);
  font-size: 0.95rem;
  letter-spacing: 0.1em;
  color: var(--md-primary-hover);
  background: transparent;
  border: 1px solid var(--md-primary);
  border-radius: var(--md-radius);
  cursor: pointer;
  transition: background-color 0.2s var(--md-ease-out), border-color 0.2s var(--md-ease-out), color 0.2s var(--md-ease-out);
}

.hero-btn:hover {
  background: var(--md-primary-bg);
}

.hero-btn.primary {
  background: var(--md-primary);
  border-color: var(--md-primary);
  color: var(--md-text-on-primary);
}

.hero-btn.primary:hover {
  background: var(--md-primary-hover);
  border-color: var(--md-primary-hover);
}

/* 敬请期待：与 hero 拉开节奏差（一紧一松） */
.upcoming {
  flex: 1;
  padding: 5rem 2rem 6rem;
  background: var(--md-bg);
}

.section-title {
  font-family: var(--md-font-display);
  font-size: 1.6rem;
  color: var(--md-text);
  margin: 0 0 2.5rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

/* 卡片列表：非对称 editorial 节奏，打破等高网格 */
.card-list {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.upcoming-card {
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-lg);
  padding: 1.75rem 1.75rem;
  text-align: left;
  position: relative;
  box-shadow: var(--md-shadow-card);
  transition: box-shadow 0.3s var(--md-ease-out), border-color 0.3s var(--md-ease-out);
}

/* 第一张卡稍大，制造非对称 */
.upcoming-card.card-major {
  padding: 2.25rem 2rem;
}

.upcoming-card:hover {
  box-shadow: var(--md-shadow-card-hover);
  border-color: var(--md-primary);
}

/* icon 内联到标题旁，不再独占圆形 */
.card-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-family: var(--md-font-display);
  font-size: 1.05rem;
  color: var(--md-primary);
  background: var(--md-primary-bg);
  border-radius: var(--md-radius-sm);
  flex-shrink: 0;
}

.card-title {
  font-family: var(--md-font-display);
  font-size: 1.15rem;
  color: var(--md-text);
  margin: 0;
  font-weight: 600;
}

.card-major .card-title {
  font-size: 1.3rem;
}

.card-desc {
  font-family: var(--md-font-body);
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--md-text-secondary);
  margin: 0 0 1rem;
}

.card-badge {
  display: inline-block;
  font-family: var(--md-font-body);
  font-size: 0.75rem;
  color: var(--md-primary-hover);
  background: var(--md-primary-bg);
  border: none;
  padding: 0.25rem 0.8rem;
  border-radius: var(--md-radius-sm);
}

/* 彩蛋弹窗 */
.egg-overlay {
  position: fixed;
  inset: 0;
  background: rgba(74, 74, 74, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--md-z-toast);
}

.egg-modal {
  text-align: center;
  max-width: 90vw;
}

.egg-img {
  max-width: 400px;
  max-height: 60vh;
  border-radius: var(--md-radius);
  border: 3px solid var(--md-primary);
}

.egg-text {
  color: var(--md-text-on-primary);
  font-family: var(--md-font-display);
  font-size: 1.3rem;
  margin: 1.5rem 0 1rem;
  letter-spacing: 0.1em;
}

.egg-close {
  background: transparent;
  color: var(--md-text-on-primary);
  border: 1px solid var(--md-primary);
  padding: 0.5rem 1.5rem;
  border-radius: var(--md-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s var(--md-ease-out);
}

.egg-close:hover {
  background: var(--md-primary);
}

/* 弹窗动画 */
.egg-enter-active,
.egg-leave-active {
  transition: opacity 0.3s;
}

.egg-enter-from,
.egg-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 600px) {
  .easter-egg {
    width: 100px;
    height: 100px;
    top: -50px;
    right: -50px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .easter-egg,
  .egg-enter-active,
  .egg-leave-active {
    transition: none;
  }
}
</style>
