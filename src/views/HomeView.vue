<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppFooter from '../components/AppFooter.vue'
import ThemeToggle from '../components/ThemeToggle.vue'

const router = useRouter()
const auth = useAuthStore()

// 彩蛋
const showEgg = ref(false)

// ===== 时辰问候 =====
const hour = new Date().getHours()
const greetingWord = hour < 5 ? '夜深了' : hour < 9 ? '早安' : hour < 12 ? '上午好' : hour < 14 ? '午安' : hour < 18 ? '下午好' : '晚上好'
const greeting = computed(() => {
  const who = auth.isLoggedIn && auth.user?.nickname ? `，${auth.user.nickname}，欢迎回来` : '，欢迎来到学院'
  return greetingWord + who
})

// 学院导览（真实上线的功能，非"敬请期待"）
const features = [
  { title: '男德通', desc: 'AI 群聊助手。群聊里的任何事都能问：谁最活跃、几月聊了什么、某人说过什么。', icon: '通', path: '/chat', major: true },
  { title: '师德墙', desc: '学院公告墙。看看大家都在挂什么，点赞评论走一波。', icon: '墙', path: '/wall' },
  { title: '院长信箱', desc: '提意见、报 BUG、催更新。信件直达院长案头，亲自批阅。', icon: '箱', path: '/mailbox' },
]
</script>

<template>
  <div class="page">
    <!-- 彩蛋：右上角露一角 -->
    <div class="easter-egg" @click="showEgg = true" title="?"></div>

    <!-- 主题开关（落地页无 TopBar，独立悬浮） -->
    <div class="landing-theme-toggle">
      <ThemeToggle />
    </div>

    <!-- Hero：左对齐，打破居中三件套 -->
    <header class="hero">
      <div class="hero-inner">
        <p class="hero-greeting">{{ greeting }}</p>
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

    <!-- 学院导览：真实功能入口，非对称卡片 -->
    <section class="features">
      <h2 class="section-title">学院导览</h2>
      <div class="feature-grid">
        <button
          v-for="f in features"
          :key="f.title"
          class="feature-card"
          :class="{ 'card-major': f.major }"
          @click="router.push(f.path)"
        >
          <div class="card-head">
            <span class="card-icon">{{ f.icon }}</span>
            <h3 class="card-title">{{ f.title }}</h3>
          </div>
          <p class="card-desc">{{ f.desc }}</p>
          <span class="card-arrow" aria-hidden="true">→</span>
        </button>
      </div>
      <p class="feature-note">未登录也能逛，功能页会引导你先登录。</p>
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

/* 落地页主题开关悬浮位（无 TopBar 时仍可切换晚自习模式） */
.landing-theme-toggle {
  position: fixed;
  right: 20px;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  z-index: var(--md-z-elevated);
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

.hero-greeting {
  font-family: var(--md-font-display);
  font-size: 1rem;
  letter-spacing: 0.14em;
  color: var(--md-primary-hover);
  margin: 0 0 1rem;
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

/* 学院导览：与 hero 拉开节奏差（一紧一松） */
.features {
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
  max-width: 880px;
  margin-left: auto;
  margin-right: auto;
}

/* 卡片网格：桌面三列，首卡高亮主推 */
.feature-grid {
  max-width: 880px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background-color: var(--md-bg-card);
  background-image: var(--md-paper-grain);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-lg);
  padding: 1.75rem 1.75rem 2.75rem;
  text-align: left;
  position: relative;
  font-family: var(--md-font-body);
  color: var(--md-text);
  cursor: pointer;
  box-shadow: var(--md-shadow-card);
  transition: box-shadow 0.3s var(--md-ease-out), border-color 0.3s var(--md-ease-out), transform 0.3s var(--md-ease-out);
}

.feature-card.card-major {
  background-image: var(--md-paper-grain), var(--md-hall-hero-bg);
  border-color: transparent;
}

.feature-card:hover {
  box-shadow: var(--md-shadow-card-lift);
  border-color: var(--md-primary);
  transform: translateY(-3px) rotate(-0.4deg);
}

.feature-card:focus-visible {
  outline: 2px solid var(--md-primary-hover);
  outline-offset: 2px;
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

.card-arrow {
  position: absolute;
  right: 1.5rem;
  bottom: 1.25rem;
  font-size: 1rem;
  color: var(--md-text-disabled);
  transition: color 0.2s var(--md-ease-out), transform 0.2s var(--md-ease-out);
}

.feature-card:hover .card-arrow {
  color: var(--md-primary);
  transform: translateX(3px);
}

.feature-note {
  max-width: 880px;
  margin: 1.75rem auto 0;
  font-size: 0.85rem;
  color: var(--md-text-disabled);
  text-align: center;
}

/* 彩蛋弹窗 */
.egg-overlay {
  position: fixed;
  inset: 0;
  background: var(--md-overlay);
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
  color: var(--md-text);
  font-family: var(--md-font-display);
  font-size: 1.3rem;
  margin: 1.5rem 0 1rem;
  letter-spacing: 0.1em;
}

.egg-close {
  background: transparent;
  color: var(--md-text);
  border: 1px solid var(--md-primary);
  padding: 0.5rem 1.5rem;
  border-radius: var(--md-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s var(--md-ease-out);
}

.egg-close:hover {
  background: var(--md-primary);
  color: var(--md-text-on-primary);
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
@media (max-width: 780px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
}

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
