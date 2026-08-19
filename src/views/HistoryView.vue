<script setup>
/**
 * 岁月史书（/history）
 *
 * 一期：剧情可视化编辑器（R-034）
 * - 章节选择（序章/第一章），动态加载骨架+文案 -> nodesToFlow -> 画布
 * - 工具栏：自动布局 / 校验 / 导出文案 .script.js
 * - 导出产物为格式化源码，手动替换 data/scripts/ 下对应文件即生效（零后端改动）
 *
 * 二期规划（R-043）：学院数据展示中心
 */
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import StoryEditor from '../components/history/StoryEditor.vue'
import { nodesToFlow, layoutWithDagre } from '../history/converter.js'
import dagre from '@dagrejs/dagre'

// ===== 章节加载（镜像 visualNovelStore.CHAPTER_LOADERS 的静态数据部分） =====
const CHAPTERS = [
  {
    id: 'prologue',
    label: '序章·漂泊者降临',
    load: async () => {
      const [{ default: skeleton }, s1, s2, s3, s4] = await Promise.all([
        import('../visualnovel/data/prologue.js'),
        import('../visualnovel/data/scripts/序章-第一幕-降临.script.js'),
        import('../visualnovel/data/scripts/序章-第二幕-法刺来访.script.js'),
        import('../visualnovel/data/scripts/序章-第三幕-储物发放.script.js'),
        import('../visualnovel/data/scripts/序章-第四幕-自由探索.script.js'),
      ])
      const scriptNodes = [s1.default, s2.default, s3.default, s4.default].flat()
      return { skeleton, scriptNodes }
    },
  },
  {
    id: 'chapter1',
    label: '第一章·三线剧变',
    load: async () => {
      const [{ default: skeleton }, s1, s2, s3, s4] = await Promise.all([
        import('../visualnovel/data/chapter1.js'),
        import('../visualnovel/data/scripts/第一章-幕间-德塔日常.script.js'),
        import('../visualnovel/data/scripts/第一章-第一幕-帝桥.script.js'),
        import('../visualnovel/data/scripts/第一章-第二幕-风从北方来.script.js'),
        import('../visualnovel/data/scripts/第一章-第三幕-东来的信.script.js'),
      ])
      const scriptNodes = [s1.default, s2.default, s3.default, s4.default].flat()
      return { skeleton, scriptNodes }
    },
  },
]

const currentChapter = ref('prologue')
const loading = ref(false)
const skeleton = ref([])
const scriptNodes = ref([])
const flowNodes = ref([])
const flowEdges = ref([])
const importWarnings = ref([])
const editorRef = ref(null)
const dirty = ref(false)

// 加载章节 -> 转画布
const loadChapter = async (chapterId) => {
  const ch = CHAPTERS.find(c => c.id === chapterId)
  if (!ch) return
  loading.value = true
  dirty.value = false
  try {
    const { skeleton: sk, scriptNodes: sc } = await ch.load()
    skeleton.value = sk
    scriptNodes.value = sc
    const flow = nodesToFlow(sk, sc)
    // 初始布局在赋值前算好：:nodes 非受控模式下 Vue Flow 接管后再改 position 不生效
    flowNodes.value = layoutWithDagre(flow.nodes, flow.edges, dagre)
    flowEdges.value = flow.edges
    importWarnings.value = flow.warnings
  } finally {
    loading.value = false
  }
}

onMounted(() => loadChapter('prologue'))

// ===== 工具栏动作 =====
const onAutoLayout = () => editorRef.value?.doAutoLayout()

const onValidate = () => editorRef.value?.doValidate()

// 导出文案：生成 .script.js 源码并触发浏览器下载
const onExport = () => {
  const src = editorRef.value?.doExport()
  if (!src) return
  const blob = new Blob([src], { type: 'text/javascript;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentChapter.value}-文案.script.js`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const onEditorUpdate = () => { dirty.value = true }

const nodeCount = computed(() => flowNodes.value.length)
const edgeCount = computed(() => flowEdges.value.length)
</script>

<template>
  <div class="history-page">
    <TopBar />

    <div class="history-main">
      <!-- 工具栏 -->
      <header class="toolbar" role="toolbar" aria-label="编辑器工具栏">
        <div class="toolbar-left">
          <h1 class="page-title">岁月史书</h1>
          <span class="page-sub">剧情编辑器 · 一期</span>
          <span v-if="dirty" class="dirty-badge" data-testid="dirty-badge">未导出</span>
        </div>
        <div class="toolbar-center">
          <label class="chapter-select-wrap" for="chapter-select">章节</label>
          <select
            id="chapter-select"
            v-model="currentChapter"
            class="chapter-select"
            data-testid="chapter-select"
            @change="loadChapter(currentChapter)"
          >
            <option v-for="c in CHAPTERS" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
          <span class="stat" data-testid="stat-nodes">{{ nodeCount }} 节点</span>
          <span class="stat" data-testid="stat-edges">{{ edgeCount }} 连线</span>
        </div>
        <div class="toolbar-right">
          <button class="tool-btn" data-testid="btn-layout" @click="onAutoLayout">自动布局</button>
          <button class="tool-btn" data-testid="btn-validate" @click="onValidate">校验</button>
          <button class="tool-btn primary" data-testid="btn-export" @click="onExport">导出文案</button>
        </div>
      </header>

      <!-- 导入警告条 -->
      <div v-if="importWarnings.length" class="import-warnings" data-testid="import-warnings">
        导入警告：{{ importWarnings.join('；') }}
      </div>

      <!-- 编辑器画布 -->
      <div class="editor-wrap">
        <div v-if="loading" class="loading-hint">剧本加载中…</div>
        <StoryEditor
          v-else
          ref="editorRef"
          :nodes="flowNodes"
          :edges="flowEdges"
          :skeleton="skeleton"
          :script-nodes="scriptNodes"
          @update="onEditorUpdate"
          @export="onExport"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--md-bg, #f5f4f0);
}

.history-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--md-sp-3, 12px) var(--md-sp-5, 24px) var(--md-sp-4, 16px);
  gap: var(--md-sp-2, 8px);
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--md-sp-3, 12px);
  padding: var(--md-sp-2, 8px) var(--md-sp-4, 16px);
  background: var(--md-bg-card, #fff);
  border: 1px solid var(--md-border, #e5e3dd);
  border-radius: var(--md-radius, 8px);
  box-shadow: var(--md-shadow-card, 0 1px 4px rgba(0, 0, 0, 0.05));
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: var(--md-sp-2, 8px);
}

.page-title {
  font-size: var(--md-fs-lg, 18px);
  font-weight: 700;
  color: var(--md-text, #333);
  margin: 0;
}

.page-sub {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-secondary, #888);
}

.dirty-badge {
  font-size: var(--md-fs-xs, 12px);
  padding: 1px 6px;
  border-radius: var(--md-radius-full, 999px);
  background: var(--md-warning, #b08040);
  color: #fff;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: var(--md-sp-2, 8px);
}

.chapter-select-wrap {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-secondary, #888);
}

.chapter-select {
  padding: 4px 8px;
  border: 1px solid var(--md-border, #ddd);
  border-radius: var(--md-radius-sm, 4px);
  background: var(--md-bg, #fff);
  color: var(--md-text, #333);
  font-size: var(--md-fs-sm, 13px);
}

.stat {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-secondary, #888);
  padding: 2px 8px;
  background: var(--md-bg-soft, #f0efe9);
  border-radius: var(--md-radius-full, 999px);
}

.toolbar-right {
  display: flex;
  gap: var(--md-sp-2, 8px);
}

.tool-btn {
  padding: 5px 12px;
  border: 1px solid var(--md-border, #ddd);
  border-radius: var(--md-radius-sm, 4px);
  background: var(--md-bg, #fff);
  color: var(--md-text, #333);
  font-size: var(--md-fs-sm, 13px);
  cursor: pointer;
  transition: all 0.15s var(--md-ease-out, ease-out);
}

.tool-btn:hover {
  border-color: var(--md-primary, #A8C5A0);
  color: var(--md-primary, #A8C5A0);
}

.tool-btn.primary {
  background: var(--md-primary, #A8C5A0);
  border-color: var(--md-primary, #A8C5A0);
  color: var(--md-text-on-primary, #fff);
}

.tool-btn.primary:hover {
  background: var(--md-primary-hover, #96b38e);
}

/* 导入警告 */
.import-warnings {
  padding: var(--md-sp-2, 8px) var(--md-sp-4, 16px);
  background: var(--md-warning, #b08040);
  color: #fff;
  border-radius: var(--md-radius-sm, 4px);
  font-size: var(--md-fs-xs, 12px);
}

/* 编辑器区域 */
.editor-wrap {
  flex: 1;
  min-height: 70vh;
  border: 1px solid var(--md-border, #e5e3dd);
  border-radius: var(--md-radius, 8px);
  overflow: hidden;
  background: var(--md-bg-card, #fff);
  position: relative;
}

.loading-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--md-overlay, rgba(0, 0, 0, 0.3));
  color: #fff;
  font-size: var(--md-fs-md, 14px);
  z-index: var(--md-z-overlay, 50);
}

/* 窄屏 */
@media (max-width: 768px) {
  .history-main {
    padding: var(--md-sp-2, 8px);
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-center,
  .toolbar-right {
    justify-content: flex-end;
  }
}
</style>
