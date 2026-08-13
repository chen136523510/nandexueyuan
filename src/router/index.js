import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('../views/MainView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('../views/ChatView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/wall',
    name: 'wall',
    component: () => import('../views/WallView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/mailbox',
    name: 'mailbox',
    component: () => import('../views/FeedbackView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/nde',
    name: 'nde',
    component: () => import('../views/NdeVisualNovelView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/character',
    name: 'character',
    component: () => import('../views/CharacterView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/RegisterView.vue'),
    meta: { guestOnly: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 刷新后恢复用户数据：有 token 但还没从后端拉过 user 信息时，先 fetchMe
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (auth.isLoggedIn && !auth.loaded) {
    await auth.fetchMe()
    // fetchMe 失败会 logout 清 token，此时如果目标页需要登录就跳登录
    if (!auth.isLoggedIn && to.meta.requiresAuth) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin && auth.role !== 'super_admin' && auth.role !== 'admin') {
    return { name: 'home' }
  }

  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'home' }
  }

  // 德塔（视觉小说）为桌面端体验（手游/页游差距大）：移动端访问直接回大厅
  if (to.name === 'nde' && typeof window !== 'undefined' && window.innerWidth <= 768) {
    return { name: 'home' }
  }
})

export default router
