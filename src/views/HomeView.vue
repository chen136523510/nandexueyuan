<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppFooter from '../components/AppFooter.vue'

const router = useRouter()
const auth = useAuthStore()

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

    <!-- Hero -->
    <header class="hero">
      <h1 class="hero-title">男 德 学 院</h1>
      <p class="hero-subtitle">修身 齐家 摸鱼 开摆</p>
      <div class="hero-actions">
        <template v-if="auth.isLoggedIn">
          <button class="hero-btn primary" @click="router.push('/home')">进入学院</button>
        </template>
        <template v-else>
          <button class="hero-btn primary" @click="router.push('/login')">登录</button>
          <button class="hero-btn" @click="router.push('/register')">注册</button>
        </template>
      </div>
    </header>

    <!-- 敬请期待 -->
    <section class="upcoming">
      <h2 class="section-title">即将上线</h2>
      <div class="card-grid">
        <article v-for="u in upcoming" :key="u.title" class="upcoming-card">
          <span class="card-icon">{{ u.icon }}</span>
          <h3 class="card-title">{{ u.title }}</h3>
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
  z-index: 100;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.easter-egg:hover {
  opacity: 1;
}

/* Hero — 莫兰迪浅绿渐变 + 点状纹理 */
.hero {
  background:
    radial-gradient(circle, rgba(168, 197, 160, 0.2) 1px, transparent 1px),
    linear-gradient(135deg, #EEF3EC 0%, #FAF8F3 100%);
  background-size: 24px 24px, 100% 100%;
  color: var(--md-text);
  text-align: center;
  padding: 5rem 1.5rem 4rem;
}

.hero-title {
  font-family: var(--md-font);
  font-size: clamp(2.5rem, 7vw, 4.5rem);
  font-weight: 700;
  letter-spacing: 0.25em;
  margin: 0 0 1rem;
  color: var(--md-text);
}

.hero-subtitle {
  font-family: var(--md-font);
  font-size: 1.15rem;
  letter-spacing: 0.4em;
  color: var(--md-primary-hover);
  margin: 0 0 2rem;
}

/* Hero 按钮区 */
.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.hero-btn {
  padding: 0.6rem 1.75rem;
  font-family: var(--md-font);
  font-size: 0.95rem;
  letter-spacing: 0.1em;
  color: var(--md-primary-hover);
  background: transparent;
  border: 1px solid var(--md-primary);
  border-radius: var(--md-radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

.hero-btn:hover {
  background: var(--md-primary-bg);
}

.hero-btn.primary {
  background: var(--md-primary);
  border-color: var(--md-primary);
  color: #fff;
}

.hero-btn.primary:hover {
  background: var(--md-primary-hover);
  border-color: var(--md-primary-hover);
}

/* 敬请期待 */
.upcoming {
  flex: 1;
  padding: 4rem 1.5rem;
  background: var(--md-bg);
}

.section-title {
  text-align: center;
  font-family: var(--md-font);
  font-size: 1.5rem;
  color: var(--md-text);
  margin: 0 0 3rem;
  letter-spacing: 0.15em;
  font-weight: 500;
}

.card-grid {
  max-width: 700px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.upcoming-card {
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-lg);
  padding: 2rem 1.5rem;
  text-align: center;
  position: relative;
  box-shadow: var(--md-shadow-sm);
  transition: box-shadow 0.2s ease;
}

.upcoming-card:hover {
  box-shadow: var(--md-shadow);
  border-color: var(--md-primary);
}

.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-family: var(--md-font);
  font-size: 1.4rem;
  color: var(--md-primary);
  border: 1px solid var(--md-primary);
  border-radius: 50%;
  margin-bottom: 1.2rem;
}

.card-title {
  font-size: 1.1rem;
  color: var(--md-text);
  margin: 0 0 0.6rem;
  font-weight: 500;
}

.card-desc {
  font-size: 0.88rem;
  line-height: 1.75;
  color: var(--md-text-secondary);
  margin: 0 0 1.2rem;
}

.card-badge {
  display: inline-block;
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
  z-index: 200;
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
  color: #fff;
  font-family: var(--md-font);
  font-size: 1.3rem;
  margin: 1.5rem 0 1rem;
  letter-spacing: 0.1em;
}

.egg-close {
  background: transparent;
  color: #fff;
  border: 1px solid var(--md-primary);
  padding: 0.5rem 1.5rem;
  border-radius: var(--md-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
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
