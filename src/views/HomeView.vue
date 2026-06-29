<script setup>
import { ref } from 'vue'
import AppFooter from '../components/AppFooter.vue'

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

/* Hero */
.hero {
  background: var(--color-green);
  color: var(--color-paper);
  text-align: center;
  padding: 5rem var(--space-page) 4rem;
}

.hero-mark {
  display: inline-block;
  font-family: var(--font-serif);
  font-size: 0.9rem;
  letter-spacing: 0.3em;
  color: var(--color-ochre);
  border: 1px solid var(--color-ochre);
  padding: 0.3rem 0.8rem;
  margin-bottom: 2rem;
}

.hero-title {
  font-family: var(--font-serif);
  font-size: clamp(2.5rem, 7vw, 4.5rem);
  font-weight: 700;
  letter-spacing: 0.25em;
  margin: 0 0 1rem;
}

.hero-subtitle {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  letter-spacing: 0.4em;
  color: var(--color-green-light);
  margin: 0 0 2rem;
}

.hero-desc {
  font-size: 0.95rem;
  line-height: 1.8;
  color: #c8c4b8;
  margin: 0;
}

/* 敬请期待 */
.upcoming {
  flex: 1;
  padding: 4rem var(--space-page);
  background: var(--color-paper-light);
}

.section-title {
  text-align: center;
  font-family: var(--font-serif);
  font-size: 1.5rem;
  color: var(--color-ink);
  margin: 0 0 3rem;
  letter-spacing: 0.15em;
}

.card-grid {
  max-width: 700px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.upcoming-card {
  background: #fff;
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius);
  padding: 2rem 1.5rem;
  text-align: center;
  position: relative;
}

.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: var(--color-ochre);
  border: 1px solid var(--color-ochre);
  border-radius: 50%;
  margin-bottom: 1.2rem;
}

.card-title {
  font-size: 1.1rem;
  color: var(--color-ink);
  margin: 0 0 0.6rem;
}

.card-desc {
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--color-ink-soft);
  margin: 0 0 1.2rem;
}

.card-badge {
  display: inline-block;
  font-size: 0.75rem;
  color: var(--color-green-dim);
  border: 1px dashed var(--color-green-dim);
  padding: 0.2rem 0.8rem;
  border-radius: 2px;
}

/* 彩蛋弹窗 */
.egg-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
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
  border-radius: var(--radius);
  border: 3px solid var(--color-ochre);
}

.egg-text {
  color: var(--color-paper);
  font-family: var(--font-serif);
  font-size: 1.3rem;
  margin: 1.5rem 0 1rem;
  letter-spacing: 0.1em;
}

.egg-close {
  background: transparent;
  color: var(--color-paper);
  border: 1px solid var(--color-green-dim);
  padding: 0.5rem 1.5rem;
  border-radius: 2px;
  cursor: pointer;
  font-size: 0.9rem;
}

.egg-close:hover {
  border-color: var(--color-green-light);
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
