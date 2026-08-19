import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initModuleTracking } from './composables/useModuleTracking'
import './styles/variables.css'
import './styles/base.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// 模块访问埋点（岁月史书·学院数据）：路由进入/离开自动上报
initModuleTracking(router)
