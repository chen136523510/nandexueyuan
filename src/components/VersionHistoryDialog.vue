<script setup>
import { ref, watch, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { getVersions, createVersion, updateVersion, deleteVersion } from '../api/announcement'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close', 'updated'])

const auth = useAuthStore()
const isAdmin = computed(() => auth.role === 'admin' || auth.role === 'super_admin')

// 版本列表
const versions = ref([])
const loading = ref(false)

// 编辑/新增表单
const editing = ref(false)       // 是否处于编辑态
const editingId = ref(null)      // null = 新增, 数字 = 编辑
const form = ref({
  version: '',
  date: '',
  summary: '',
  updates: [''],
  plans: [''],
})
const formLoading = ref(false)
const formMsg = ref('')

// 弹窗打开时加载数据
watch(() => props.show, async (val) => {
  if (val) {
    editing.value = false
    editingId.value = null
    await loadVersions()
  }
})

async function loadVersions() {
  loading.value = true
  try {
    const res = await getVersions()
    versions.value = res.data.versions
  } catch (err) {
    console.error('加载版本列表失败', err)
  } finally {
    loading.value = false
  }
}

function startCreate() {
  editing.value = true
  editingId.value = null
  form.value = {
    version: '',
    date: new Date().toISOString().slice(0, 10),
    summary: '',
    updates: [''],
    plans: [''],
  }
  formMsg.value = ''
}

function startEdit(v) {
  editing.value = true
  editingId.value = v.id
  form.value = {
    version: v.version,
    date: new Date(v.date).toISOString().slice(0, 10),
    summary: v.summary,
    updates: v.updates.length ? [...v.updates] : [''],
    plans: v.plans.length ? [...v.plans] : [''],
  }
  formMsg.value = ''
}

function cancelEdit() {
  editing.value = false
  editingId.value = null
}

function addUpdate() { form.value.updates.push('') }
function removeUpdate(i) { form.value.updates.splice(i, 1) }
function addPlan() { form.value.plans.push('') }
function removePlan(i) { form.value.plans.splice(i, 1) }

async function saveVersion() {
  if (!form.value.version.trim()) {
    formMsg.value = '版本号不能为空'
    return
  }
  if (!form.value.date) {
    formMsg.value = '日期不能为空'
    return
  }

  // 过滤空字符串
  const updates = form.value.updates.filter(s => s.trim())
  const plans = form.value.plans.filter(s => s.trim())
  const payload = {
    version: form.value.version.trim(),
    date: form.value.date,
    summary: form.value.summary.trim(),
    updates,
    plans,
  }

  formLoading.value = true
  formMsg.value = ''
  try {
    if (editingId.value) {
      await updateVersion(editingId.value, payload)
    } else {
      await createVersion(payload)
    }
    editing.value = false
    editingId.value = null
    await loadVersions()
    emit('updated')
  } catch (err) {
    formMsg.value = err.message || '保存失败'
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(v) {
  if (!confirm(`确认删除版本 ${v.version}？`)) return
  try {
    await deleteVersion(v.id)
    await loadVersions()
    emit('updated')
  } catch (err) {
    alert(err.message || '删除失败')
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay" @click="emit('close')">
      <div class="modal-card" @click.stop>
        <!-- 头部 -->
        <div class="modal-header">
          <h2 class="modal-title">📋 版本历史</h2>
          <button class="modal-close" @click="emit('close')">×</button>
        </div>

        <!-- 列表态 -->
        <div v-if="!editing" class="modal-body">
          <div v-if="isAdmin" class="list-toolbar">
            <button class="btn-new" @click="startCreate">+ 新增版本</button>
          </div>

          <div v-if="loading" class="empty-state">加载中...</div>
          <div v-else-if="versions.length === 0" class="empty-state">暂无版本记录</div>

          <div v-else class="version-list">
            <div v-for="v in versions" :key="v.id" class="version-item">
              <div class="version-head">
                <span class="version-badge">{{ v.version }}</span>
                <span class="version-date">{{ formatDate(v.date) }}</span>
                <div v-if="isAdmin" class="version-actions">
                  <button class="btn-mini" @click="startEdit(v)">编辑</button>
                  <button class="btn-mini btn-danger" @click="handleDelete(v)">删除</button>
                </div>
              </div>
              <p v-if="v.summary" class="version-summary">{{ v.summary }}</p>
              <div v-if="v.updates.length" class="version-section">
                <span class="section-label">📋 本次更新</span>
                <ol class="section-list">
                  <li v-for="(u, i) in v.updates" :key="i">{{ u }}</li>
                </ol>
              </div>
              <div v-if="v.plans.length" class="version-section">
                <span class="section-label">🚀 未来规划</span>
                <ol class="section-list">
                  <li v-for="(p, i) in v.plans" :key="i">{{ p }}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <!-- 编辑态 -->
        <div v-else class="modal-body">
          <h3 class="edit-title">{{ editingId ? '编辑版本' : '新增版本' }}</h3>

          <div class="form-row">
            <div class="form-group">
              <label>版本号</label>
              <input v-model="form.version" type="text" class="form-input" placeholder="v1.1.0" />
            </div>
            <div class="form-group">
              <label>日期</label>
              <input v-model="form.date" type="date" class="form-input" />
            </div>
          </div>

          <div class="form-group">
            <label>摘要（一句话，显示在公告栏）</label>
            <input v-model="form.summary" type="text" class="form-input" placeholder="新增德塔NPC精灵，优化男德通检索逻辑" />
          </div>

          <div class="form-group">
            <label>📋 本次更新</label>
            <div v-for="(_, i) in form.updates" :key="i" class="dynamic-input">
              <input v-model="form.updates[i]" type="text" class="form-input" :placeholder="`第 ${i + 1} 条`" />
              <button v-if="form.updates.length > 1" class="btn-remove" @click="removeUpdate(i)">✕</button>
            </div>
            <button class="btn-add" @click="addUpdate">+ 添加更新项</button>
          </div>

          <div class="form-group">
            <label>🚀 未来规划</label>
            <div v-for="(_, i) in form.plans" :key="i" class="dynamic-input">
              <input v-model="form.plans[i]" type="text" class="form-input" :placeholder="`第 ${i + 1} 条`" />
              <button v-if="form.plans.length > 1" class="btn-remove" @click="removePlan(i)">✕</button>
            </div>
            <button class="btn-add" @click="addPlan">+ 添加规划项</button>
          </div>

          <p v-if="formMsg" class="form-msg error">{{ formMsg }}</p>

          <div class="form-actions">
            <button class="btn-cancel" @click="cancelEdit">取消</button>
            <button class="btn-save" :disabled="formLoading" @click="saveVersion">
              {{ formLoading ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
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
  width: 560px;
  max-width: 92vw;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--md-divider);
}

.modal-title {
  font-size: var(--md-fs-lg);
  font-weight: 600;
  color: var(--md-text);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--md-text-secondary);
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
  transition: color 0.2s;
}

.modal-close:hover { color: var(--md-text); }

.modal-body { padding: 20px 24px; }

/* 列表态 */
.list-toolbar { margin-bottom: 16px; }

.btn-new {
  padding: 6px 16px;
  background: var(--md-primary);
  color: #fff;
  border: none;
  border-radius: var(--md-radius);
  font-size: var(--md-fs-sm);
  cursor: pointer;
  transition: background 0.2s;
}

.btn-new:hover { background: var(--md-primary-hover); }

.empty-state {
  text-align: center;
  color: var(--md-text-secondary);
  padding: 40px 0;
  font-size: var(--md-fs-base);
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.version-item {
  background: var(--md-bg-soft);
  border-radius: var(--md-radius);
  padding: 16px;
  border: 1px solid var(--md-divider);
}

.version-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.version-badge {
  font-size: var(--md-fs-sm);
  font-weight: 600;
  color: var(--md-primary);
  background: var(--md-primary-bg);
  padding: 2px 10px;
  border-radius: var(--md-radius-full);
}

.version-date {
  font-size: var(--md-fs-xs);
  color: var(--md-text-secondary);
}

.version-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.btn-mini {
  padding: 2px 10px;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  background: var(--md-bg-card);
  font-size: var(--md-fs-xs);
  color: var(--md-text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.btn-mini:hover { border-color: var(--md-primary); color: var(--md-primary); }
.btn-mini.btn-danger:hover { border-color: var(--md-danger); color: var(--md-danger); }

.version-summary {
  font-size: var(--md-fs-base);
  color: var(--md-text);
  margin: 4px 0 12px;
  line-height: 1.6;
}

.version-section { margin-top: 8px; }

.section-label {
  font-size: var(--md-fs-xs);
  font-weight: 600;
  color: var(--md-text-secondary);
}

.section-list {
  margin: 4px 0 0;
  padding-left: 20px;
  font-size: var(--md-fs-sm);
  color: var(--md-text);
  line-height: 1.7;
}

/* 编辑态 */
.edit-title {
  font-size: var(--md-fs-md);
  font-weight: 600;
  color: var(--md-text);
  margin: 0 0 16px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group { flex: 1; }

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-group label {
  font-size: var(--md-fs-sm);
  color: var(--md-text-secondary);
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius);
  font-size: var(--md-fs-base);
  color: var(--md-text);
  background: var(--md-bg-card);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
}

.form-input:focus {
  border-color: var(--md-primary);
  box-shadow: 0 0 0 3px rgba(168, 197, 160, 0.15);
}

.dynamic-input {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.dynamic-input .form-input { flex: 1; }

.btn-remove {
  flex: 0 0 28px;
  height: 28px;
  align-self: center;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-sm);
  background: var(--md-bg-card);
  font-size: 12px;
  color: var(--md-danger);
  cursor: pointer;
}

.btn-remove:hover { background: var(--md-danger); color: #fff; border-color: var(--md-danger); }

.btn-add {
  align-self: flex-start;
  background: none;
  border: 1px dashed var(--md-border);
  border-radius: var(--md-radius);
  padding: 6px 14px;
  font-size: var(--md-fs-sm);
  color: var(--md-text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.btn-add:hover { border-color: var(--md-primary); color: var(--md-primary); }

.form-msg {
  font-size: var(--md-fs-sm);
  margin: 8px 0;
}

.form-msg.error { color: var(--md-danger); }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.btn-cancel {
  padding: 8px 20px;
  background: var(--md-bg-card);
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius);
  font-size: var(--md-fs-base);
  color: var(--md-text-secondary);
  cursor: pointer;
  transition: border-color 0.2s;
}

.btn-cancel:hover { border-color: var(--md-text-secondary); }

.btn-save {
  padding: 8px 20px;
  background: var(--md-primary);
  border: none;
  border-radius: var(--md-radius);
  font-size: var(--md-fs-base);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-save:hover:not(:disabled) { background: var(--md-primary-hover); }
.btn-save:disabled { background: var(--md-text-disabled); cursor: not-allowed; }

/* 动画 */
.modal-enter-active,
.modal-leave-active { transition: opacity 0.25s; }

.modal-enter-active .modal-card,
.modal-leave-active .modal-card { transition: transform 0.25s, opacity 0.25s; }

.modal-enter-from,
.modal-leave-to { opacity: 0; }

.modal-enter-from .modal-card,
.modal-leave-to .modal-card { transform: scale(0.95); opacity: 0; }
</style>
