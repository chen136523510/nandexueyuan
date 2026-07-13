import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vite 配置：开发服务器 5173，API 反向代理到后端 3000
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 4396,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        // SSE 流式：阻止代理缓冲响应
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('accept-encoding')
          })
        },
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
