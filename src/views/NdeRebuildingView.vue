<script setup>
// 德塔重构占位页
import TopBar from '../components/TopBar.vue'
import AppFooter from '../components/AppFooter.vue'
</script>

<template>
  <div class="nde-rebuild-page">
    <TopBar />

    <div class="rebuild-container">
      <div class="rebuild-card">
        <h1 class="rebuild-title">德塔</h1>
        <p class="rebuild-subtitle">正在重构中</p>
        <p class="rebuild-desc">原德塔设计已废弃，正在重构为全新的叙事体验</p>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<style scoped>
.nde-rebuild-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.rebuild-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.rebuild-card {
  background: var(--md-bg-card);
  border-radius: var(--md-radius-lg);
  border: 1px solid var(--md-border);
  box-shadow: var(--md-shadow-sm);
  padding: 48px 40px;
  text-align: center;
  max-width: 420px;
  width: 100%;
}

.rebuild-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--md-primary);
  margin: 0 0 8px;
}

.rebuild-subtitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--md-text);
  margin: 0 0 20px;
}

.rebuild-desc {
  font-size: 14px;
  line-height: 1.75;
  color: var(--md-text-secondary);
  margin: 0;
}
</style>
