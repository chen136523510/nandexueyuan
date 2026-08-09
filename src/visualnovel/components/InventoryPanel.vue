<script setup>
import { ref, computed } from 'vue'
import { useVisualNovelStore } from '../stores/visualNovelStore.js'
import { getItem } from '../data/items.js'

const store = useVisualNovelStore()

// 选中的物品详情
const selectedItem = ref(null)

// 判断 icon 是否为图片路径（以 / 开头）
function isImageIcon(icon) {
  return icon && icon.startsWith('/')
}

// 背包物品列表（从 store.inventory 的 id 解析为物品数据）
const items = computed(() => {
  return store.inventory.map((id) => getItem(id)).filter(Boolean)
})

// 网格槽位数（固定 20 格，剩余显示空槽）
const SLOT_COUNT = 20

function selectItem(item) {
  selectedItem.value = item
}

function closeDetail() {
  selectedItem.value = null
}

function close() {
  selectedItem.value = null
  store.closePanel()
}
</script>

<template>
  <div v-if="store.activePanel === 'inventory'" class="inv-overlay" role="dialog" aria-modal="true" aria-label="储物空间面板" @click.self="close">
    <div class="inv-panel">
      <div class="inv-header">
        <h2 class="inv-title">🎒 储物空间</h2>
        <button class="inv-close" aria-label="关闭" data-testid="vn-inventory-close-btn" @click="close">✕</button>
      </div>

      <div class="inv-body">
        <!-- 物品网格 -->
        <div class="inv-grid">
          <div
            v-for="n in SLOT_COUNT"
            :key="n"
            class="inv-slot"
            :class="{ filled: items[n - 1] }"
            @click="items[n - 1] && selectItem(items[n - 1])"
          >
            <template v-if="items[n - 1]">
              <img v-if="isImageIcon(items[n - 1].icon)" class="slot-icon slot-icon-img" :src="items[n - 1].icon" :alt="items[n - 1].name" />
              <span v-else class="slot-icon">{{ items[n - 1].icon }}</span>
              <span class="slot-name">{{ items[n - 1].name }}</span>
            </template>
          </div>
        </div>

        <!-- 空背包提示 -->
        <p v-if="items.length === 0" class="inv-empty">储物空间内暂无物品</p>
      </div>
    </div>

    <!-- 物品详情弹窗 -->
    <div v-if="selectedItem" class="detail-overlay" role="dialog" aria-modal="true" :aria-label="`${selectedItem.name}详情`" @click.self="closeDetail">
      <div class="detail-panel">
        <img v-if="isImageIcon(selectedItem.icon)" class="detail-icon detail-icon-img" :src="selectedItem.icon" :alt="selectedItem.name" />
        <div v-else class="detail-icon">{{ selectedItem.icon }}</div>
        <h3 class="detail-name">{{ selectedItem.name }}</h3>
        <p class="detail-type">{{ selectedItem.type === 'key_item' ? '关键道具' : selectedItem.type === 'consumable' ? '消耗品' : '材料' }}</p>
        <p class="detail-desc">{{ selectedItem.description }}</p>
        <button class="detail-close" data-testid="vn-item-detail-close-btn" @click="closeDetail">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inv-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.inv-panel {
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid rgba(201, 169, 110, 0.2);
  border-radius: 12px;
  width: 90%;
  max-width: 480px;
}

.inv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.inv-title {
  font-size: 18px;
  font-weight: 700;
  color: #e8e0cc;
}

.inv-close {
  background: none;
  border: none;
  color: #8b95a8;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

.inv-close:hover {
  color: #e8e0cc;
}

.inv-body {
  padding: 20px 24px;
}

/* 物品网格 */
.inv-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.inv-slot {
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: default;
  transition: all 0.2s ease;
}

.inv-slot.filled {
  cursor: pointer;
  background: rgba(201, 169, 110, 0.06);
  border-color: rgba(201, 169, 110, 0.15);
}

.inv-slot.filled:hover {
  background: rgba(201, 169, 110, 0.12);
  border-color: rgba(201, 169, 110, 0.4);
  box-shadow: 0 0 12px rgba(201, 169, 110, 0.15);
}

.slot-icon {
  font-size: 24px;
  line-height: 1;
}

.slot-icon-img {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.slot-name {
  font-size: 10px;
  color: rgba(232, 224, 204, 0.7);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
}

/* 空背包提示 */
.inv-empty {
  text-align: center;
  color: #8b95a8;
  font-size: 13px;
  margin-top: 16px;
}

/* 物品详情弹窗 */
.detail-overlay {
  position: absolute;
  inset: 0;
  z-index: 45;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-panel {
  background: rgba(13, 17, 23, 0.98);
  border: 1px solid rgba(201, 169, 110, 0.3);
  border-radius: 12px;
  padding: 32px 40px;
  text-align: center;
  max-width: 360px;
}

.detail-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.detail-icon-img {
  width: 160px;
  height: 160px;
  margin: 0 auto 12px;
  object-fit: contain;
}

.detail-name {
  font-size: 20px;
  font-weight: 700;
  color: #e8e0cc;
  margin: 0 0 4px;
}

.detail-type {
  font-size: 12px;
  color: rgba(201, 169, 110, 0.6);
  margin: 0 0 16px;
}

.detail-desc {
  font-size: 14px;
  line-height: 1.8;
  color: #b0b8c4;
  margin: 0 0 24px;
  text-align: left;
}

.detail-close {
  padding: 8px 32px;
  background: rgba(201, 169, 110, 0.12);
  border: 1px solid rgba(201, 169, 110, 0.3);
  border-radius: 6px;
  color: rgba(201, 169, 110, 0.9);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-close:hover {
  background: rgba(201, 169, 110, 0.2);
  border-color: rgba(201, 169, 110, 0.5);
}

/* 移动端 */
@media (max-width: 768px) {
  .inv-panel {
    width: 95%;
  }
  .inv-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .slot-icon {
    font-size: 20px;
  }
  .slot-name {
    font-size: 9px;
  }
}
</style>
