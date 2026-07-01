<script setup>
// 关于页面
</script>

<template>
  <div class="qz-page">
    <nav class="qz-navbar">
      <span class="qz-navbar-brand">男德学院</span>
      <div class="qz-navbar-nav">
        <router-link to="/" class="qz-navbar-link">首页</router-link>
        <router-link to="/about" class="qz-navbar-link active">关于</router-link>
      </div>
    </nav>

    <div class="qz-container">
      <div class="qz-card">
        <div class="qz-card-header">
          <span class="qz-card-title">关于男德学院</span>
        </div>
        <p class="about-text">页面建设中...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qz-navbar {
  height: 52px;
  background: var(--qz-bg-card);
  border-bottom: 1px solid var(--qz-border);
  display: flex;
  align-items: center;
  padding: 0 var(--qz-space-xl);
}
.qz-navbar-brand {
  font-size: var(--qz-font-size-lg);
  font-weight: 700;
  color: var(--qz-primary);
}
.qz-navbar-nav {
  display: flex;
  gap: var(--qz-space-lg);
  margin-left: var(--qz-space-xxl);
}
.qz-navbar-link {
  font-size: var(--qz-font-size-base);
  color: var(--qz-text-secondary);
  transition: color 0.2s;
}
.qz-navbar-link:hover,
.qz-navbar-link.active {
  color: var(--qz-primary);
}
.qz-container {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--qz-space-xl);
}
.qz-card {
  background: var(--qz-bg-card);
  border-radius: var(--qz-radius-md);
  box-shadow: var(--qz-shadow-sm);
  padding: var(--qz-space-lg);
}
.qz-card-header {
  padding-bottom: var(--qz-space-md);
  border-bottom: 1px solid var(--qz-border-light);
  margin-bottom: var(--qz-space-lg);
}
.qz-card-title {
  font-size: var(--qz-font-size-lg);
  font-weight: 600;
}
.about-text {
  color: var(--qz-text-secondary);
  font-size: var(--qz-font-size-base);
}
</style>
