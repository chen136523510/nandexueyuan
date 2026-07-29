<script setup>
import { ref, watch, computed } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'

const props = defineProps({
  mode: { type: String, default: 'save' }, // 'save' | 'load'
})

const store = useVisualNovelStore()
const saves = ref([])
const loading = ref(false)
const msg = ref('')

const title = computed(() => props.mode === 'save' ? '存档' : '读档')

// 11 个槽位：0=自动，1-10=手动
const slots = computed(() => {
  const list = []
  for (let i = 0; i <= 10; i++) {
    const save = saves.value.find((s) => s.slot === i)
    list.push({
      slot: i,
      save,
      label: i === 0 ? '自动' : `槽位 ${i}`,
    })
  }
  return list
})

async function fetchSaves() {
  loading.value = true
  saves.value = await store.fetchSaves()
  loading.value = false
}

// 面板打开时加载存档列表
watch(
  () => store.activePanel,
  (panel) => {
    if (panel === 'save' || panel === 'load') {
      fetchSaves()
    }
  }
)

async function handleSave(slot) {
  loading.value = true
  msg.value = ''
  const ok = await store.saveToSlot(slot)
  loading.value = false
  if (ok) {
    msg.value = `已保存到${slot === 0 ? '自动存档' : `槽位 ${slot}`}`
    await fetchSaves()
    setTimeout(() => { msg.value = '' }, 2000)
  } else {
    msg.value = '保存失败，请重试'
  }
}

async function handleLoad(slot) {
  loading.value = true
  msg.value = ''
  const ok = await store.loadFromSlot(slot)
  loading.value = false
  if (ok) {
    store.closePanel()
  } else {
    msg.value = '读取失败，请重试'
  }
}

async function handleDelete(slot) {
  loading.value = true
  await store.removeSave(slot)
  loading.value = false
  await fetchSaves()
}

function close() {
  store.closePanel()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <div v-if="store.activePanel === mode" class="sl-overlay" @click.self="close">
    <div class="sl-panel">
      <div class="sl-header">
        <h2 class="sl-title">{{ title }}</h2>
        <button class="sl-close" @click="close">✕</button>
      </div>

      <div v-if="msg" class="sl-msg">{{ msg }}</div>

      <div class="sl-grid">
        <div
          v-for="item in slots"
          :key="item.slot"
          class="sl-slot"
          :class="{ empty: !item.save }"
        >
          <!-- 缩略图区 -->
          <div class="sl-thumb">
            <img
              v-if="item.save?.thumbnail"
              :src="item.save.thumbnail"
              alt="存档缩略图"
            />
            <div v-else class="sl-thumb-placeholder">
              {{ item.save ? '无缩略图' : '空' }}
            </div>
          </div>

          <!-- 信息区 -->
          <div class="sl-info">
            <span class="sl-slot-label">{{ item.label }}</span>
            <span v-if="item.save" class="sl-date">{{ formatDate(item.save.updatedAt) }}</span>
            <span v-if="item.save" class="sl-chapter">{{ item.save.chapter }} · {{ item.save.node }}</span>
          </div>

          <!-- 操作按钮 -->
          <div class="sl-actions">
            <button
              v-if="mode === 'save'"
              class="sl-btn primary"
              :disabled="loading"
              @click="handleSave(item.slot)"
            >
              保存
            </button>
            <button
              v-else
              class="sl-btn primary"
              :disabled="loading || !item.save"
              @click="handleLoad(item.slot)"
            >
              读取
            </button>
            <button
              v-if="item.save"
              class="sl-btn danger"
              :disabled="loading"
              @click="handleDelete(item.slot)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sl-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sl-panel {
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid rgba(201, 169, 110, 0.2);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sl-title {
  font-size: 18px;
  font-weight: 700;
  color: #e8e0cc;
  margin: 0;
}

.sl-close {
  background: none;
  border: none;
  color: #8b95a8;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.sl-close:hover {
  color: #e8e0cc;
  background: rgba(255, 255, 255, 0.06);
}

.sl-msg {
  padding: 8px 24px;
  color: rgba(201, 169, 110, 0.8);
  font-size: 13px;
}

.sl-grid {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sl-slot {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 10px 12px;
  transition: all 0.2s;
}

.sl-slot:hover {
  background: rgba(255, 255, 255, 0.06);
}

.sl-slot.empty {
  opacity: 0.5;
}

.sl-thumb {
  width: 80px;
  height: 50px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
}

.sl-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sl-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(139, 149, 168, 0.4);
  font-size: 12px;
}

.sl-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sl-slot-label {
  font-size: 14px;
  font-weight: 600;
  color: #e8e0cc;
}

.sl-date {
  font-size: 12px;
  color: #8b95a8;
}

.sl-chapter {
  font-size: 11px;
  color: rgba(139, 149, 168, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sl-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.sl-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.sl-btn.primary {
  background: rgba(201, 169, 110, 0.2);
  color: rgba(201, 169, 110, 0.9);
}

.sl-btn.primary:hover:not(:disabled) {
  background: rgba(201, 169, 110, 0.3);
}

.sl-btn.danger {
  background: rgba(201, 96, 96, 0.15);
  color: rgba(201, 96, 96, 0.8);
}

.sl-btn.danger:hover:not(:disabled) {
  background: rgba(201, 96, 96, 0.25);
}

.sl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .sl-panel {
    width: 94%;
  }
  .sl-thumb {
    width: 60px;
    height: 38px;
  }
  .sl-slot-label {
    font-size: 13px;
  }
}
</style>
