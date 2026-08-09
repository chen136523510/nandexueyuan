<script setup>
import { ref, watch, computed } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'

const store = useVisualNovelStore()
const saves = ref([])
const loading = ref(false)
const msg = ref('')

// 11 个槽位：0=自动，1-10=手动
const slots = computed(() => {
  const list = []
  for (let i = 0; i <= 10; i++) {
    const save = saves.value.find((s) => s.slot === i)
    list.push({
      slot: i,
      save,
      label: i === 0 ? '自动' : `槽位 ${i}`,
      isAuto: i === 0,
      isEmpty: !save,
    })
  }
  return list
})

// 第一个空的手动槽位（用于"新建存档"）
const firstEmptySlot = computed(() => {
  for (let i = 1; i <= 10; i++) {
    if (!saves.value.find((s) => s.slot === i)) return i
  }
  return null
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
    if (panel === 'save') {
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

// 新建存档：创建一个"从头开始"的全新存档（非当前进度快照）
async function handleNewSave() {
  const slot = firstEmptySlot.value
  if (!slot) {
    msg.value = '所有槽位已满，请先删除旧存档'
    setTimeout(() => { msg.value = '' }, 3000)
    return
  }
  // 构造全新快照（章节起始节点 + 空状态）
  const startNode = store.getChapterStartNode('prologue')
  if (!startNode) {
    msg.value = '新建失败：无法获取起始节点'
    setTimeout(() => { msg.value = '' }, 3000)
    return
  }
  loading.value = true
  msg.value = ''
  const ok = await store.saveSnapshotToSlot(slot, {
    node: startNode,
    chapter: 'prologue',
    affinity: {},
    variables: {},
    inventory: [],
    stage: [],
  })
  loading.value = false
  if (ok) {
    msg.value = `已新建存档到槽位 ${slot}（从头开始）`
    await fetchSaves()
    setTimeout(() => { msg.value = '' }, 2500)
  } else {
    msg.value = '新建失败，请重试'
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
  <div v-if="store.activePanel === 'save'" class="sl-overlay" role="dialog" aria-modal="true" aria-label="存档管理面板" @click.self="close">
    <div class="sl-panel">
      <div class="sl-header">
        <h2 class="sl-title">存档管理</h2>
        <button class="sl-close" aria-label="关闭" data-testid="vn-saveload-close-btn" @click="close">✕</button>
      </div>

      <div v-if="msg" class="sl-msg">{{ msg }}</div>

      <div class="sl-grid">
        <div
          v-for="item in slots"
          :key="item.slot"
          class="sl-slot"
          :class="{ empty: !item.save, auto: item.isAuto }"
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
            <span class="sl-slot-label">
              {{ item.label }}
              <span v-if="item.isAuto" class="sl-tag-auto">自动</span>
            </span>
            <span v-if="item.save" class="sl-date">{{ formatDate(item.save.updatedAt) }}</span>
            <span v-if="item.save" class="sl-chapter">{{ item.save.chapter }} · {{ item.save.node }}</span>
          </div>

          <!-- 操作按钮：每个槽位都有存档+读档 -->
          <div class="sl-actions">
            <!-- 存档按钮 -->
            <button
              v-if="!item.isAuto"
              class="sl-btn primary"
              :disabled="loading"
              :data-testid="`vn-save-slot-${item.slot}-btn`"
              @click="handleSave(item.slot)"
            >
              {{ item.isEmpty ? '存档' : '覆盖' }}
            </button>
            <!-- 自动存档：存档只读 -->
            <span v-else class="sl-readonly">系统自动</span>

            <!-- 读档按钮：空槽位置灰 -->
            <button
              class="sl-btn load"
              :disabled="loading || !item.save"
              :data-testid="`vn-load-slot-${item.slot}-btn`"
              @click="handleLoad(item.slot)"
            >
              读档
            </button>

            <!-- 删除（自动存档不可删除） -->
            <button
              v-if="item.save && !item.isAuto"
              class="sl-btn danger"
              :disabled="loading"
              :data-testid="`vn-delete-slot-${item.slot}-btn`"
              @click="handleDelete(item.slot)"
            >
              删除
            </button>
          </div>
        </div>
      </div>

      <!-- 底部：新建存档快捷按钮 -->
      <div class="sl-footer">
        <button
          class="sl-new-btn"
          :disabled="loading || !firstEmptySlot"
          data-testid="vn-new-save-btn"
          @click="handleNewSave"
        >
          {{ firstEmptySlot ? `新建存档（槽位 ${firstEmptySlot}）` : '所有槽位已满' }}
        </button>
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

.sl-slot.auto {
  border-color: rgba(201, 169, 110, 0.15);
}

.sl-tag-auto {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 5px;
  font-size: 10px;
  color: rgba(201, 169, 110, 0.7);
  background: rgba(201, 169, 110, 0.1);
  border-radius: 3px;
}

.sl-readonly {
  font-size: 12px;
  color: rgba(139, 149, 168, 0.5);
  white-space: nowrap;
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

.sl-btn.load {
  background: rgba(100, 160, 220, 0.15);
  color: rgba(140, 180, 220, 0.9);
}

.sl-btn.load:hover:not(:disabled) {
  background: rgba(100, 160, 220, 0.25);
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

/* 底部新建存档按钮 */
.sl-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.sl-new-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, rgba(201, 169, 110, 0.2) 0%, rgba(201, 169, 110, 0.1) 100%);
  border: 1px dashed rgba(201, 169, 110, 0.3);
  border-radius: 8px;
  color: rgba(201, 169, 110, 0.9);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.sl-new-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(201, 169, 110, 0.3) 0%, rgba(201, 169, 110, 0.15) 100%);
  border-color: rgba(201, 169, 110, 0.5);
  border-style: solid;
}

.sl-new-btn:disabled {
  opacity: 0.4;
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
