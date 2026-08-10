<script setup>
import { useVisualNovelStore } from '../stores/visualNovelStore.js'

const store = useVisualNovelStore()

function close() {
  store.closePanel()
}
</script>

<template>
  <div v-if="store.activePanel === 'settings'" class="sp-overlay" role="dialog" aria-modal="true" aria-label="设置面板" @click.self="close">
    <div class="sp-panel">
      <div class="sp-header">
        <h2 class="sp-title">设置</h2>
        <button class="sp-close" aria-label="关闭" data-testid="vn-settings-close-btn" @click="close">✕</button>
      </div>

      <div class="sp-body">
        <!-- 文字速度 -->
        <div class="sp-row">
          <label class="sp-label">文字速度</label>
          <div class="sp-control">
            <span class="sp-hint">快</span>
            <input
              type="range"
              min="5"
              max="80"
              step="5"
              :value="100 - store.textSpeed"
              @input="store.textSpeed = 100 - Number($event.target.value)"
              class="sp-slider"
            />
            <span class="sp-hint">慢</span>
          </div>
        </div>

        <!-- 自动播放延迟 -->
        <div class="sp-row">
          <label class="sp-label">自动播放间隔</label>
          <div class="sp-control">
            <input
              type="range"
              min="500"
              max="5000"
              step="500"
              v-model.number="store.autoDelay"
              class="sp-slider"
            />
            <span class="sp-value">{{ (store.autoDelay / 1000).toFixed(1) }}秒</span>
          </div>
        </div>

        <!-- 自动播放开关 -->
        <div class="sp-row">
          <label class="sp-label">自动播放</label>
          <button
            class="sp-toggle"
            role="switch"
            :aria-pressed="store.autoMode"
            :aria-label="`自动播放${store.autoMode ? '已开启' : '已关闭'}`"
            :data-testid="`vn-auto-toggle`"
            :class="{ on: store.autoMode }"
            @click="store.toggleAutoMode()"
          >
            {{ store.autoMode ? '开' : '关' }}
          </button>
        </div>

        <!-- 声音开关 -->
        <div class="sp-row">
          <label class="sp-label">声音</label>
          <button
            class="sp-toggle"
            role="switch"
            :aria-pressed="store.soundEnabled"
            :aria-label="`声音${store.soundEnabled ? '已开启' : '已关闭'}`"
            data-testid="vn-sound-toggle"
            :class="{ on: store.soundEnabled }"
            @click="store.soundEnabled = !store.soundEnabled"
          >
            {{ store.soundEnabled ? '开' : '关' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sp-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sp-panel {
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid rgba(201, 169, 110, 0.2);
  border-radius: 12px;
  width: 90%;
  max-width: 420px;
}

.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sp-title {
  font-size: 18px;
  font-weight: 700;
  color: #e8e0cc;
}

.sp-close {
  background: none;
  border: none;
  color: #8b95a8;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

.sp-close:hover {
  color: #e8e0cc;
}

.sp-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sp-label {
  font-size: 14px;
  color: #e8e0cc;
  flex-shrink: 0;
}

.sp-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sp-hint {
  font-size: 12px;
  color: #8b95a8;
}

.sp-value {
  font-size: 13px;
  color: rgba(201, 169, 110, 0.8);
  min-width: 36px;
  text-align: right;
}

.sp-slider {
  width: 160px;
  accent-color: rgba(201, 169, 110, 0.6);
}

.sp-toggle {
  padding: 6px 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: #8b95a8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.sp-toggle.on {
  background: rgba(201, 169, 110, 0.2);
  border-color: rgba(201, 169, 110, 0.4);
  color: rgba(201, 169, 110, 0.9);
}
</style>
