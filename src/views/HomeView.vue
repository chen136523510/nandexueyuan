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

/* Hero */
.hero {
  background: #1f3d2e;
  color: #f4f1ea;
  text-align: center;
  padding: 5rem 1.5rem 4rem;
}

.hero-title {
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: clamp(2.5rem, 7vw, 4.5rem);
  font-weight: 700;
  letter-spacing: 0.25em;
  margin: 0 0 1rem;
}

.hero-subtitle {
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: 1.15rem;
  letter-spacing: 0.4em;
  color: #a8c4b4;
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

.hero-welcome {
  font-size: 0.9rem;
  color: #a8c4b4;
  letter-spacing: 0.05em;
}

.hero-btn {
  padding: 0.5rem 1.75rem;
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: 0.9rem;
  letter-spacing: 0.15em;
  color: #f4f1ea;
  background: transparent;
  border: 1px solid #a8c4b4;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.hero-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.hero-btn.primary {
  background: #c8743b;
  border-color: #c8743b;
  color: #2d2620;
}

.hero-btn.primary:hover {
  background: #c9a961;
}

/* 敬请期待 */
.upcoming {
  flex: 1;
  padding: 4rem 1.5rem;
  background: #faf8f3;
}

.section-title {
  text-align: center;
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: 1.5rem;
  color: #2d2620;
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
  border: 1px solid #e8e4d8;
  border-radius: 4px;
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
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: 1.4rem;
  color: #c8743b;
  border: 1px solid #c8743b;
  border-radius: 50%;
  margin-bottom: 1.2rem;
}

.card-title {
  font-size: 1.1rem;
  color: #2d2620;
  margin: 0 0 0.6rem;
}

.card-desc {
  font-size: 0.88rem;
  line-height: 1.7;
  color: #6b6358;
  margin: 0 0 1.2rem;
}

.card-badge {
  display: inline-block;
  font-size: 0.75rem;
  color: #4a6b5a;
  border: 1px dashed #4a6b5a;
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
  border-radius: 4px;
  border: 3px solid #c8743b;
}

.egg-text {
  color: #f4f1ea;
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: 1.3rem;
  margin: 1.5rem 0 1rem;
  letter-spacing: 0.1em;
}

.egg-close {
  background: transparent;
  color: #f4f1ea;
  border: 1px solid #4a6b5a;
  padding: 0.5rem 1.5rem;
  border-radius: 2px;
  cursor: pointer;
  font-size: 0.9rem;
}

.egg-close:hover {
  border-color: #a8c4b4;
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
