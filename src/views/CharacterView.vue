<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { updateSkin } from '../api/user'

const router = useRouter()
const auth = useAuthStore()

// 当前选中的形象 id（1-5），null = 未选
const selectedId = ref(null)
const saving = ref(false)
const errorMsg = ref('')

// 5 套形象：只展示"形象 A/B/C/D/E"，不写描述
const LETTERS = ['A', 'B', 'C', 'D', 'E']
const SETS = LETTERS.map((letter, i) => ({
  id: i + 1,
  letter,
  // fallback 颜色（与 PreloadScene playerColors 一致）
  color: ['#F48FB1', '#424242', '#FFD54F', '#B0BEC5', '#4FC3F7'][i],
  portrait: `/game/portraits/player_set${i + 1}.png`,
  sprite: `/game/sprites/players/player_set${i + 1}_walk.png`,
}))

// 立绘/精灵加载失败时 fallback 为色块（真实资源待 ComfyUI 生成）
function onImgError(e, color) {
  const target = e.target
  target.style.display = 'none'
  const fb = target.parentElement.querySelector('.img-fallback')
  if (fb) {
    fb.style.display = 'flex'
    fb.style.background = color
  }
}

async function confirm() {
  if (!selectedId.value || saving.value) return
  saving.value = true
  errorMsg.value = ''
  try {
    const res = await updateSkin({ skinId: String(selectedId.value) })
    auth.setSkinId(res.data.skinId)
    router.push('/nde')
  } catch (err) {
    errorMsg.value = err.message || '保存失败，请重试'
    saving.value = false
  }
}
</script>

<template>
  <div class="select-page">
    <div class="select-inner">
      <!-- 返回按钮 -->
      <button class="back-btn" @click="router.push('/')">
        ← 返回
      </button>

      <h1 class="title">选择形象</h1>
      <p class="subtitle">进入德塔前，请选择一位形象</p>

      <!-- 横向角色列表（原神/奥奇传说风格） -->
      <div class="char-list">
        <div
          v-for="set in SETS"
          :key="set.id"
          class="char-card"
          :class="{ active: selectedId === set.id }"
          @click="selectedId = set.id"
        >
          <!-- 上方：立绘 -->
          <div class="portrait-box">
            <img :src="set.portrait" :alt="`形象${set.letter}`" @error="onImgError($event, set.color)" />
            <div class="img-fallback">{{ set.letter }}</div>
          </div>
          <!-- 下方：精灵（只显示第一帧，放大居中） -->
          <div class="sprite-box">
            <div
              class="sprite-frame"
              :style="{ backgroundImage: `url(${set.sprite})` }"
            ></div>
          </div>
          <!-- 名称 -->
          <div class="char-name">形象 {{ set.letter }}</div>
          <!-- 选中标记 -->
          <div v-if="selectedId === set.id" class="check-mark">✓</div>
        </div>
      </div>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <button class="confirm-btn" :disabled="!selectedId || saving" @click="confirm">
        {{ saving ? '保存中…' : '确认选择' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.select-page {
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at center, #1a2332 0%, #0d1117 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-x: hidden;
}

.select-inner {
  width: 100%;
  max-width: 1400px;
  padding: 32px 24px;
  text-align: center;
  position: relative;
}

/* 返回按钮 */
.back-btn {
  position: absolute;
  top: 0;
  left: 0;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.08);
  color: #8b95a8;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #f0e6d2;
}

.title {
  font-size: 32px;
  font-weight: 700;
  color: #f0e6d2;
  margin: 0 0 8px;
  letter-spacing: 4px;
}

.subtitle {
  color: #8b95a8;
  font-size: 15px;
  margin: 0 0 40px;
}

/* 横向角色列表 */
.char-list {
  display: flex;
  gap: 16px;
  justify-content: center;
  padding: 8px 8px 24px;
  margin-bottom: 32px;
}

.char-card {
  flex: 1 1 0;
  min-width: 140px;
  max-width: 220px;
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  overflow: hidden;
  position: relative;
}

.char-card:hover {
  border-color: rgba(201, 169, 110, 0.5);
  background: rgba(255, 255, 255, 0.07);
  transform: translateY(-4px);
}

.char-card.active {
  border-color: #c9a96e;
  background: rgba(201, 169, 110, 0.12);
  box-shadow: 0 0 20px rgba(201, 169, 110, 0.35);
  transform: translateY(-6px);
}

/* 立绘区域 */
.portrait-box {
  height: 320px;
  position: relative;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

.portrait-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
}

/* 精灵区域：只显示第一帧 */
.sprite-box {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.sprite-frame {
  width: 48px;
  height: 48px;
  background-size: 96px 96px;  /* 2x2 网格缩小到 96px，每帧 48px */
  background-position: 0 0;    /* 左上角帧 */
  background-repeat: no-repeat;
  image-rendering: pixelated;
}

/* 图片加载失败的色块兜底 */
.img-fallback {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
  font-family: serif;
}

.sprite-box .img-fallback {
  font-size: 28px;
}

.char-name {
  padding: 12px 0;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #e8e0cc;
  letter-spacing: 2px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.char-card.active .char-name {
  color: #c9a96e;
}

.check-mark {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #c9a96e;
  color: #0d1117;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.error {
  color: #ff6b6b;
  font-size: 14px;
  margin-bottom: 16px;
}

.confirm-btn {
  padding: 14px 56px;
  background: linear-gradient(135deg, #c9a96e 0%, #a8895a 100%);
  color: #0d1117;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 4px;
}

.confirm-btn:hover:not(:disabled) {
  transform: scale(1.03);
  box-shadow: 0 4px 20px rgba(201, 169, 110, 0.4);
}

.confirm-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 屏幕较窄时卡片缩小 */
@media (max-width: 768px) {
  .char-list {
    gap: 8px;
  }
  .char-card {
    min-width: 110px;
  }
  .portrait-box {
    height: 200px;
  }
  .title {
    font-size: 24px;
  }
}
</style>
