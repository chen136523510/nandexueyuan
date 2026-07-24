<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { updateSkin } from '../api/user'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const auth = useAuthStore()

// 选择形象
const selectedSkin = ref('1')
const skinMsg = ref('')
const skinLoading = ref(false)

// 弹窗打开时同步数据
watch(() => props.show, (val) => {
  if (val) {
    selectedSkin.value = auth.skinId || '1'
    skinMsg.value = ''
  }
})

/** 选择并保存玩家形象 */
async function handleSkin(id) {
  const newId = String(id)
  if (newId === selectedSkin.value && auth.skinId === newId) return
  selectedSkin.value = newId
  skinLoading.value = true
  skinMsg.value = ''
  try {
    const res = await updateSkin({ skinId: newId })
    auth.user.skinId = res.data.skinId
    auth.setSkinId(res.data.skinId)
    skinMsg.value = '形象已更新（重进德塔生效）'
  } catch (err) {
    skinMsg.value = err.message || '更新失败'
  } finally {
    skinLoading.value = false
  }
}

/** 头像加载失败 → 隐藏图片 */
function onAvatarError(e) {
  e.target.style.display = 'none'
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay" @click="emit('close')">
      <div class="modal-card nde-settings-card" @click.stop>
        <!-- 弹窗头部 -->
        <div class="modal-header">
          <h2 class="modal-title">德塔相关设置</h2>
          <button class="modal-close" @click="emit('close')">×</button>
        </div>

        <!-- 主体：左侧立绘 + 右侧形象选择 -->
        <div class="nde-settings-body">
          <!-- 左侧：当前选择的完整立绘展示 -->
          <div class="nde-portrait-col">
            <div class="nde-portrait-box">
              <img
                :src="`/game/portraits/player_set${selectedSkin}.png`"
                :alt="`形象 ${selectedSkin} 立绘`"
                @error="onAvatarError"
              />
            </div>
            <div class="nde-portrait-caption">当前形象: {{ selectedSkin }} / 5</div>
          </div>

          <!-- 右侧：形象列表，每个展示小头像 + 完整精灵行走图 -->
          <div class="nde-skin-list-col">
            <div class="nde-section-title">选择形象</div>
            <div class="nde-skin-list">
              <div
                v-for="i in 5"
                :key="i"
                class="nde-skin-option"
                :class="{ active: String(i) === selectedSkin }"
                @click="handleSkin(i)"
              >
                <div class="nde-skin-preview">
                  <div class="nde-skin-avatar">
                    <img
                      :src="`/game/sprites/avatars/player_set${i}.png`"
                      :alt="`头像 ${i}`"
                      @error="onAvatarError"
                    />
                  </div>
                  <span>形象 {{ i }}</span>
                </div>
                <div class="nde-skin-sprite">
                  <!-- 展示完整行走精灵图 -->
                  <img
                    :src="`/game/sprites/players/player_set${i}_walk.png`"
                    :alt="`精灵表 ${i}`"
                    @error="onAvatarError"
                  />
                </div>
              </div>
            </div>
            <p v-if="skinMsg" class="form-msg" :class="{ error: skinMsg.includes('失败') }">
              {{ skinMsg }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 复用全局 ProfileDialog 的基础样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}
.modal-card {
  background: var(--md-bg-card);
  border-radius: var(--md-radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
  max-width: 92vw;
  max-height: 85vh;
  overflow-y: auto;
}
.nde-settings-card {
  width: 720px;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--md-divider);
}
.modal-title {
  margin: 0;
  font-size: var(--md-fs-xl);
  color: var(--md-text);
  font-weight: 600;
}
.modal-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: var(--md-text-secondary);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--md-radius-sm);
  transition: background 0.2s;
}
.modal-close:hover {
  background: var(--md-bg-soft);
  color: var(--md-text);
}

/* 德塔设置主体 */
.nde-settings-body {
  display: flex;
  gap: 16px;
  padding: 16px;
  min-height: 400px;
}
/* 左侧立绘列 */
.nde-portrait-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.nde-portrait-box {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--md-bg-soft);
  border-radius: var(--md-radius);
  overflow: hidden;
  min-height: 340px;
}
.nde-portrait-box img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.nde-portrait-caption {
  text-align: center;
  font-size: 14px;
  color: var(--md-text-secondary);
  padding: 4px 0;
}

/* 右侧形象选择列 */
.nde-skin-list-col {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nde-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--md-text);
  margin-bottom: 4px;
}
.nde-skin-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.nde-skin-option {
  border: 1px solid var(--md-divider);
  border-radius: var(--md-radius);
  background: var(--md-bg);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.nde-skin-option:hover {
  border-color: var(--md-primary);
  background: var(--md-bg-soft);
}
.nde-skin-option.active {
  border-color: var(--md-primary);
  background: var(--md-primary-bg);
}
.nde-skin-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--md-divider);
}
.nde-skin-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--md-radius-sm);
  overflow: hidden;
  background: var(--md-bg-soft);
}
.nde-skin-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.nde-skin-preview span {
  font-size: 14px;
  color: var(--md-text);
  font-weight: 500;
}
.nde-skin-sprite {
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f7f2;
}
.nde-skin-sprite img {
  max-width: 100%;
  height: auto;
}

/* form 消息（复用全局 ProfileDialog 样式） */
.form-msg {
  padding: 8px 12px;
  border-radius: var(--md-radius-sm);
  background: var(--md-primary-bg);
  color: var(--md-primary);
  font-size: 13px;
  margin-top: 8px;
}
.form-msg.error {
  background: rgba(201, 160, 160, 0.15);
  color: #a85555;
}
</style>
