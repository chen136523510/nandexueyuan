<script setup>
import { ref, onMounted } from 'vue'

const message = ref('加载中...')

onMounted(async () => {
  try {
    const res = await fetch('/api/hello')
    const data = await res.json()
    message.value = data.message
  } catch (e) {
    message.value = '后端未启动或请求失败'
  }
})
</script>

<template>
  <main class="container">
    <h1>男德学院</h1>
    <p class="tagline">网站正在开发中...</p>
    <section class="card">
      <h2>后端连通性测试</h2>
      <p>{{ message }}</p>
    </section>
  </main>
</template>
