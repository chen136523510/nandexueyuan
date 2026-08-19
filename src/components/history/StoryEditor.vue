<script setup>
/**
 * 岁月史书·剧情节点编辑器画布
 *
 * 一期 PoC：
 * - 6 种节点自定义渲染（按类型分色+角标，用 Vue Flow 的 #node-xxx slot）
 * - dialogue 节点：speaker/text/next 可编辑（右侧属性面板）
 * - choice 节点：每选项 text/impact/next/effects 可编辑
 * - condition/event/input/end：只读展示字段（二期做深度编辑）
 * - dagre 自动层次布局
 * - 校验面板展示（死链/id 重复/文案不匹配）
 */
import { ref, computed } from 'vue'
import { VueFlow, useVueFlow, Handle, Position, MarkerType, Panel } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import dagre from '@dagrejs/dagre'
import { layoutWithDagre, flowToScriptFile, validate } from '../../history/converter.js'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const props = defineProps({
  nodes: { type: Array, required: true },
  edges: { type: Array, required: true },
  skeleton: { type: Array, required: true },
  scriptNodes: { type: Array, required: true },
})

const emit = defineEmits(['export', 'validate', 'update'])

const { onConnect, addEdges, fitView, updateNode, setCenter } = useVueFlow()

// 节点选中状态（属性面板联动）
const selectedId = ref(null)
const selectedNode = computed(() =>
  props.nodes.find(n => n.id === selectedId.value) || null
)

const onNodeClick = ({ node }) => { selectedId.value = node.id }
const onPaneClick = () => { selectedId.value = null }

onConnect((params) => {
  addEdges([{ ...params, id: `e_${params.source}_${params.target}_${Date.now()}`, type: 'smoothstep' }])
})

// 节点类型 -> 颜色/标签
const typeStyle = {
  dialogue:  { color: '#A8C5A0', label: '对话', icon: '💬' },
  choice:    { color: '#D4A574', label: '选项', icon: '🔀' },
  condition: { color: '#7A9EC8', label: '条件', icon: '⚖' },
  event:     { color: '#9C9CA0', label: '事件', icon: '⚙' },
  input:     { color: '#C8B070', label: '输入', icon: '⌨' },
  end:       { color: '#B07070', label: '结束', icon: '🏁' },
}
const ns = (type) => typeStyle[type] || { color: '#999', label: type, icon: '?' }

// 节点显示文案（画布上每个节点卡片只显示概要，完整编辑在右侧面板）
const nodeSummary = (data) => {
  if (!data) return ''
  if (data.text) return data.text.slice(0, 30)
  if (Array.isArray(data.choices)) return `${data.choices.length} 个选项`
  if (Array.isArray(data.branches)) return `${data.branches.length} 个分支`
  if (data.unlockChapter) return `-> 跳转章节: ${data.unlockChapter}`
  return data.type || ''
}

// 自动布局。⚠️ 不能直接 mutate props.nodes[i].position——:nodes 非受控模式下
// Vue Flow 初始化时已把数组转成内部 state，后续改原数组不生效（节点全堆原点的根因）。
// 必须走 updateNode API 写入 Vue Flow 内部 state。
const doAutoLayout = () => {
  const laid = layoutWithDagre(props.nodes, props.edges, dagre)
  for (const node of laid) {
    updateNode(node.id, { position: node.position })
  }
  setTimeout(() => fitView({ padding: 0.15 }), 50)
}

// ===== 校验 =====
const validateResult = ref(null)
const doValidate = () => {
  const { errors, warnings } = validate(props.skeleton, props.scriptNodes, props.nodes)
  validateResult.value = { errors, warnings }
  emit('validate', validateResult.value)
  return validateResult.value
}

// ===== 导出文案 =====
const doExport = () => {
  const src = flowToScriptFile(props.nodes)
  emit('export', src)
  return src
}

// ===== 编辑：choice =====
const updateChoiceText = (index, value) => {
  if (!selectedNode.value?.data?.choices) return
  selectedNode.value.data.choices[index].text = value
  emit('update')
}
const updateChoiceImpact = (index, value) => {
  if (!selectedNode.value?.data?.choices) return
  selectedNode.value.data.choices[index].impact = value
  emit('update')
}
const updateChoiceNext = (index, value) => {
  if (!selectedNode.value?.data?.choices) return
  selectedNode.value.data.choices[index].next = value
  emit('update')
}

// ===== 全图适配 =====
const doFitView = () => {
  fitView({ padding: 0.15, duration: 300 })
}

// ===== 节点搜索定位 =====
// 按 id 前缀/台词关键词匹配，回车或点结果 -> 画布居中到该节点并选中
const searchKeyword = ref('')
const searchResults = ref([])
const searchOpen = ref(false)
const doSearch = () => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) { searchResults.value = []; searchOpen.value = false; return }
  const hits = []
  for (const n of props.nodes) {
    const d = n.data || {}
    if (
      n.id.toLowerCase().includes(kw) ||
      (d.text && d.text.toLowerCase().includes(kw)) ||
      (Array.isArray(d.choices) && d.choices.some(c => (c.text || '').toLowerCase().includes(kw)))
    ) {
      hits.push({ id: n.id, label: d.text ? `${n.id} · ${d.text.slice(0, 18)}` : n.id, x: n.position.x, y: n.position.y })
      if (hits.length >= 12) break
    }
  }
  searchResults.value = hits
  searchOpen.value = true
}
const focusNode = (id, x, y) => {
  selectedId.value = id
  searchOpen.value = false
  // setCenter(视口中心坐标)：节点中心 + 节点半宽（120）
  setCenter(x + 120, y + 40, { zoom: 1.1, duration: 400 })
}

defineExpose({ doAutoLayout, doValidate, doExport, doFitView, focusNode })
</script>

<template>
  <div class="story-editor" data-testid="story-editor">
    <div class="canvas-area">
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        :default-edge-options="{
          type: 'smoothstep',
          markerEnd: MarkerType.ArrowClosed,
        }"
        :fit-view-on-init="true"
        @node-click="onNodeClick"
        @pane-click="onPaneClick"
      >
        <Background pattern-color="#aaa" :gap="16" />
        <Controls />
        <MiniMap />

        <!-- 搜索定位（Panel 固定在画布层，不随缩放平移移动） -->
        <Panel position="top-left" class="search-panel" data-testid="node-search">
          <input
            v-model="searchKeyword"
            type="text"
            class="search-input"
            placeholder="搜索节点 id / 台词 / 选项…"
            aria-label="搜索节点"
            data-testid="node-search-input"
            @keyup.enter="doSearch"
            @focus="searchKeyword && doSearch()"
          />
          <div v-if="searchOpen && searchResults.length" class="search-results" role="listbox" aria-label="搜索结果">
            <button
              v-for="r in searchResults"
              :key="r.id"
              class="search-item"
              role="option"
              :data-testid="`search-item-${r.id}`"
              @click="focusNode(r.id, r.x, r.y)"
            >
              {{ r.label }}
            </button>
          </div>
          <div v-else-if="searchOpen && !searchResults.length" class="search-empty">无匹配节点</div>
        </Panel>

        <!-- 自定义节点渲染：每种 type 一个 slot -->
        <template #node-dialogue="props">
          <div class="story-node" :class="{ selected: selectedId === props.id }" :style="{ '--node-color': ns('dialogue').color }" :data-node-id="props.id" :title="props.data.text || props.id">
            <Handle type="target" :position="Position.Left" />
            <div class="node-head"><span class="node-icon">{{ ns('dialogue').icon }}</span><span class="node-type-label">对话</span></div>
            <div class="node-body">
              <div v-if="props.data.speaker" class="node-speaker">{{ props.data.speaker }}</div>
              <div class="node-text">{{ nodeSummary(props.data) }}</div>
            </div>
            <Handle type="source" :position="Position.Right" />
          </div>
        </template>

        <template #node-choice="props">
          <div class="story-node" :class="{ selected: selectedId === props.id }" :style="{ '--node-color': ns('choice').color }" :data-node-id="props.id" :title="(props.data.choices || []).map((c, i) => `${i + 1}. ${c.text || ''}`).join('\n')">
            <Handle type="target" :position="Position.Left" />
            <div class="node-head"><span class="node-icon">{{ ns('choice').icon }}</span><span class="node-type-label">选项</span></div>
            <div class="node-body">
              <div v-for="(c, i) in (props.data.choices || []).slice(0, 3)" :key="i" class="choice-preview" :class="c.impact">{{ i + 1 }}. {{ (c.text || '').slice(0, 14) }}</div>
              <div v-if="(props.data.choices || []).length > 3" class="choice-more">…共 {{ props.data.choices.length }} 项</div>
            </div>
            <!-- choice 有多个输出端口 -->
            <Handle v-for="(c, i) in (props.data.choices || [])" :key="i" type="source" :position="Position.Right" :id="`choice-${i}`" :style="{ top: `${30 + i * 20}px` }" />
          </div>
        </template>

        <template #node-condition="props">
          <div class="story-node" :class="{ selected: selectedId === props.id }" :style="{ '--node-color': ns('condition').color }" :data-node-id="props.id">
            <Handle type="target" :position="Position.Left" />
            <div class="node-head"><span class="node-icon">{{ ns('condition').icon }}</span><span class="node-type-label">条件</span></div>
            <div class="node-body">
              <div class="node-text">{{ (props.data.branches || []).length }} 个分支</div>
            </div>
            <Handle v-for="(b, i) in (props.data.branches || [])" :key="i" type="source" :position="Position.Right" :id="`branch-${i}`" :style="{ top: `${30 + i * 20}px` }" />
          </div>
        </template>

        <template #node-event="props">
          <div class="story-node" :class="{ selected: selectedId === props.id }" :style="{ '--node-color': ns('event').color }" :data-node-id="props.id">
            <Handle type="target" :position="Position.Left" />
            <div class="node-head"><span class="node-icon">{{ ns('event').icon }}</span><span class="node-type-label">事件</span></div>
            <div class="node-body">
              <div class="node-text">{{ props.data.unlockChapter ? '-> ' + props.data.unlockChapter : (props.data.setVariables ? '设置变量' : '自动') }}</div>
            </div>
            <Handle v-if="props.data.next" type="source" :position="Position.Right" />
          </div>
        </template>

        <template #node-input="props">
          <div class="story-node" :class="{ selected: selectedId === props.id }" :style="{ '--node-color': ns('input').color }" :data-node-id="props.id">
            <Handle type="target" :position="Position.Left" />
            <div class="node-head"><span class="node-icon">{{ ns('input').icon }}</span><span class="node-type-label">输入</span></div>
            <div class="node-body">
              <div class="node-text">{{ nodeSummary(props.data) }}</div>
            </div>
            <Handle type="source" :position="Position.Right" />
          </div>
        </template>

        <template #node-end="props">
          <div class="story-node" :class="{ selected: selectedId === props.id }" :style="{ '--node-color': ns('end').color }" :data-node-id="props.id">
            <Handle type="target" :position="Position.Left" />
            <div class="node-head"><span class="node-icon">{{ ns('end').icon }}</span><span class="node-type-label">结束</span></div>
            <div class="node-body">
              <div class="node-text">{{ props.data.explore ? '探索态' : '章节结束' }}</div>
            </div>
          </div>
        </template>
      </VueFlow>
    </div>

    <!-- 右侧属性面板 -->
    <aside class="props-panel" :class="{ open: !!selectedNode }" role="region" aria-label="节点属性面板" data-testid="props-panel">
      <template v-if="selectedNode">
        <div class="props-header">
          <span class="props-badge" :style="{ '--node-color': ns(selectedNode.type).color }">
            {{ ns(selectedNode.type).icon }} {{ ns(selectedNode.type).label }}
          </span>
          <code class="props-id">{{ selectedNode.id }}</code>
        </div>

        <!-- dialogue 节点：可编辑 -->
        <div v-if="selectedNode.type === 'dialogue'" class="props-body">
          <label class="field">
            <span>说话人</span>
            <input v-model="selectedNode.data.speaker" type="text" class="field-input" data-testid="prop-speaker" @change="emit('update')" />
          </label>
          <label class="field">
            <span>台词</span>
            <textarea v-model="selectedNode.data.text" class="field-textarea" rows="4" data-testid="prop-text" @change="emit('update')"></textarea>
          </label>
          <label class="field">
            <span>下一节点</span>
            <input v-model="selectedNode.data.next" type="text" class="field-input" data-testid="prop-next" @change="emit('update')" />
          </label>
          <div v-if="selectedNode.data.background" class="field-readonly">
            <span>背景</span><code>{{ selectedNode.data.background }}</code>
          </div>
        </div>

        <!-- choice 节点：选项可编辑 -->
        <div v-else-if="selectedNode.type === 'choice'" class="props-body">
          <div v-if="!Array.isArray(selectedNode.data.choices)" class="empty-hint">无选项</div>
          <div v-for="(c, i) in (selectedNode.data.choices || [])" :key="i" class="choice-item">
            <div class="choice-head">选项 {{ i + 1 }}</div>
            <input :value="c.text" type="text" class="field-input" :data-testid="`choice-text-${i}`" placeholder="选项文案" @input="updateChoiceText(i, $event.target.value)" />
            <select :value="c.impact" class="field-select" :data-testid="`choice-impact-${i}`" @change="updateChoiceImpact(i, $event.target.value)">
              <option value="critical">critical（标黄·推进剧情）</option>
              <option value="info">info（标白·信息补充）</option>
            </select>
            <label class="field-inline">
              <span>跳转</span>
              <input :value="c.next" type="text" class="field-input" :data-testid="`choice-next-${i}`" placeholder="目标节点 id" @input="updateChoiceNext(i, $event.target.value)" />
            </label>
            <div v-if="c.effects" class="field-readonly">
              <span>效果</span><code>{{ JSON.stringify(c.effects) }}</code>
            </div>
          </div>
        </div>

        <!-- condition 节点：只读 -->
        <div v-else-if="selectedNode.type === 'condition'" class="props-body">
          <div v-if="!Array.isArray(selectedNode.data.branches)" class="empty-hint">无分支</div>
          <div v-for="(b, i) in (selectedNode.data.branches || [])" :key="i" class="branch-item">
            <div class="choice-head">分支 {{ i + 1 }}</div>
            <code v-if="b.if" class="code-block">{{ JSON.stringify(b.if) }}</code>
            <span v-else class="field-readonly-label">否则</span>
            <div class="field-readonly">
              <span>跳转</span><code>{{ b.next }}</code>
            </div>
          </div>
        </div>

        <!-- event/input/end：只读 -->
        <div v-else class="props-body">
          <pre class="json-preview">{{ JSON.stringify(selectedNode.data, null, 2) }}</pre>
          <p class="readonly-hint">该节点类型一期暂不支持编辑（二期开放）</p>
        </div>
      </template>

      <div v-else class="props-empty">
        <p>选中一个节点查看/编辑属性</p>
        <p class="hint">左键点击画布节点 -> 右侧显示属性</p>
      </div>
    </aside>

    <!-- 校验结果面板 -->
    <div v-if="validateResult" class="validate-panel" role="region" aria-label="校验结果" data-testid="validate-panel">
      <button class="close-btn" aria-label="关闭校验面板" data-testid="validate-close" @click="validateResult = null">✕</button>
      <h3>校验结果</h3>
      <div v-if="validateResult.errors.length === 0 && validateResult.warnings.length === 0" class="validate-ok">
        ✅ 全部通过，无错误无警告
      </div>
      <template v-else>
        <div v-if="validateResult.errors.length" class="validate-section error">
          <h4>错误（{{ validateResult.errors.length }}）</h4>
          <ul>
            <li v-for="(e, i) in validateResult.errors" :key="'e' + i">{{ e }}</li>
          </ul>
        </div>
        <div v-if="validateResult.warnings.length" class="validate-section warning">
          <h4>警告（{{ validateResult.warnings.length }}）</h4>
          <ul>
            <li v-for="(w, i) in validateResult.warnings" :key="'w' + i">{{ w }}</li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.story-editor {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  position: relative;
  min-height: 400px;
  background: var(--md-bg-soft, #f5f5f0);
}

.canvas-area :deep(.vue-flow) {
  background: var(--md-bg-soft, #f5f5f0);
}

/* 自定义节点卡片 */
.story-node {
  min-width: 160px;
  max-width: 240px;
  padding: 0;
  border: 2px solid var(--node-color, #A8C5A0);
  border-radius: var(--md-radius, 8px);
  background: var(--md-bg-card, #fff);
  box-shadow: var(--md-shadow-card, 0 1px 4px rgba(0, 0, 0, 0.08));
  overflow: hidden;
  font-size: 12px;
  cursor: pointer;
  transition: box-shadow 0.15s var(--md-ease-out, ease-out);
}

/* 选中态：边框加粗 + 抬升阴影 */
.story-node.selected {
  border-width: 3px;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--node-color, #A8C5A0) 30%, transparent),
    var(--md-shadow-card-lift, 0 4px 16px rgba(0, 0, 0, 0.15));
}

/* 选项预览（choice 节点卡片） */
.choice-preview {
  padding: 1px 0;
  color: var(--md-text-secondary, #666);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.choice-preview.critical {
  color: var(--md-warning, #b08040);
  font-weight: 600;
}

.choice-more {
  color: var(--md-text-disabled, #aaa);
  font-size: 11px;
}

/* 搜索定位面板（Panel 组件负责定位，这里只管宽度层级） */
.search-panel {
  width: 280px;
  z-index: var(--md-z-elevated, 10);
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--md-border, #ddd);
  border-radius: var(--md-radius-full, 999px);
  font-size: var(--md-fs-sm, 13px);
  font-family: inherit;
  background: var(--md-bg-card, #fff);
  color: var(--md-text, #333);
  box-shadow: var(--md-shadow-card, 0 1px 4px rgba(0, 0, 0, 0.08));
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: var(--md-primary, #A8C5A0);
  box-shadow: 0 0 0 3px rgba(168, 197, 160, 0.25);
}

.search-results {
  margin-top: 6px;
  max-height: 260px;
  overflow-y: auto;
  background: var(--md-bg-card, #fff);
  border: 1px solid var(--md-border, #ddd);
  border-radius: var(--md-radius, 8px);
  box-shadow: var(--md-shadow-card-lift, 0 4px 16px rgba(0, 0, 0, 0.12));
  padding: 4px;
}

.search-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: var(--md-radius-sm, 4px);
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text, #333);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-item:hover {
  background: var(--md-primary-bg, #f0f4ee);
  color: var(--md-primary, #7a9a72);
}

.search-empty {
  margin-top: 6px;
  padding: 8px 12px;
  background: var(--md-bg-card, #fff);
  border: 1px solid var(--md-border, #ddd);
  border-radius: var(--md-radius, 8px);
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-disabled, #aaa);
  text-align: center;
}

.node-head {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--node-color, #A8C5A0);
  color: #fff;
  font-weight: 600;
  font-size: 11px;
}

.node-icon {
  font-size: 12px;
}

.node-body {
  padding: 6px 8px;
}

.node-speaker {
  font-weight: 600;
  color: var(--md-text, #333);
  margin-bottom: 2px;
  font-size: 11px;
}

.node-text {
  color: var(--md-text-secondary, #666);
  line-height: 1.3;
  word-break: break-all;
}

/* 属性面板 */
.props-panel {
  width: 0;
  border-left: 1px solid var(--md-border, #e0e0e0);
  background: var(--md-bg-card, #fff);
  overflow: hidden;
  transition: width 0.2s var(--md-ease-out, ease-out);
  display: flex;
  flex-direction: column;
}

.props-panel.open {
  width: 340px;
  min-width: 340px;
}

.props-header {
  padding: var(--md-sp-3, 12px) var(--md-sp-4, 16px);
  border-bottom: 1px solid var(--md-divider, #eee);
  display: flex;
  align-items: center;
  gap: var(--md-sp-2, 8px);
}

.props-badge {
  font-size: var(--md-fs-sm, 13px);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--md-radius-sm, 4px);
  background: var(--node-color, var(--md-primary, #A8C5A0));
  color: #fff;
}

.props-id {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-secondary, #888);
  font-family: 'Courier New', monospace;
}

.props-body {
  padding: var(--md-sp-3, 12px) var(--md-sp-4, 16px);
  overflow-y: auto;
  flex: 1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--md-sp-3, 12px);
}

.field > span {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-secondary, #888);
  font-weight: 600;
}

.field-input,
.field-textarea,
.field-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--md-border, #ddd);
  border-radius: var(--md-radius-sm, 4px);
  font-size: var(--md-fs-sm, 13px);
  font-family: inherit;
  background: var(--md-bg, #fff);
  color: var(--md-text, #333);
  box-sizing: border-box;
}

.field-textarea {
  resize: vertical;
  min-height: 60px;
}

.field-input:focus,
.field-textarea:focus,
.field-select:focus {
  outline: none;
  border-color: var(--md-primary, #A8C5A0);
  box-shadow: 0 0 0 2px rgba(168, 197, 160, 0.2);
}

.field-inline {
  display: flex;
  align-items: center;
  gap: var(--md-sp-2, 8px);
  margin-top: var(--md-sp-1, 4px);
}

.field-inline > span {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-secondary, #888);
  white-space: nowrap;
}

.field-readonly {
  display: flex;
  gap: var(--md-sp-2, 8px);
  align-items: baseline;
  margin-top: var(--md-sp-1, 4px);
  font-size: var(--md-fs-xs, 12px);
}

.field-readonly > span {
  color: var(--md-text-secondary, #888);
}

.field-readonly code {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text, #333);
  word-break: break-all;
}

.field-readonly-label {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-secondary, #888);
  font-style: italic;
}

.choice-item,
.branch-item {
  padding: var(--md-sp-2, 8px);
  margin-bottom: var(--md-sp-3, 12px);
  border: 1px solid var(--md-divider, #eee);
  border-radius: var(--md-radius-sm, 4px);
  background: var(--md-bg-soft, #f9f9f5);
}

.choice-head {
  font-size: var(--md-fs-xs, 12px);
  font-weight: 600;
  color: var(--md-text-secondary, #888);
  margin-bottom: var(--md-sp-1, 4px);
}

.code-block {
  display: block;
  font-size: var(--md-fs-xs, 12px);
  padding: 4px;
  background: var(--md-bg, #fff);
  border-radius: var(--md-radius-sm, 4px);
  word-break: break-all;
  white-space: pre-wrap;
  margin-bottom: var(--md-sp-1, 4px);
}

.json-preview {
  font-size: var(--md-fs-xs, 12px);
  padding: var(--md-sp-2, 8px);
  background: var(--md-bg-soft, #f9f9f5);
  border-radius: var(--md-radius-sm, 4px);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.readonly-hint,
.empty-hint {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-disabled, #aaa);
  text-align: center;
  padding: var(--md-sp-2, 8px);
}

.props-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--md-text-secondary, #888);
  text-align: center;
  padding: var(--md-sp-4, 16px);
  font-size: var(--md-fs-sm, 13px);
}

.props-empty .hint {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text-disabled, #aaa);
  margin-top: var(--md-sp-2, 8px);
}

/* 校验面板 */
.validate-panel {
  position: absolute;
  bottom: var(--md-sp-3, 12px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 360px;
  max-width: 80%;
  max-height: 40%;
  overflow-y: auto;
  padding: var(--md-sp-3, 12px) var(--md-sp-4, 16px);
  background: var(--md-bg-card, #fff);
  border: 1px solid var(--md-border, #e0e0e0);
  border-radius: var(--md-radius, 8px);
  box-shadow: var(--md-shadow-card-lift, 0 4px 16px rgba(0, 0, 0, 0.1));
  z-index: var(--md-z-overlay, 50);
}

.validate-panel h3 {
  font-size: var(--md-fs-sm, 13px);
  margin: 0 0 var(--md-sp-2, 8px);
  color: var(--md-text, #333);
}

.validate-ok {
  color: var(--md-success, #5a8a5a);
  font-size: var(--md-fs-sm, 13px);
}

.validate-section {
  margin-top: var(--md-sp-2, 8px);
}

.validate-section h4 {
  font-size: var(--md-fs-xs, 12px);
  margin: 0 0 4px;
  font-weight: 600;
}

.validate-section.error h4 {
  color: var(--md-danger, #c04040);
}

.validate-section.warning h4 {
  color: var(--md-warning, #b08040);
}

.validate-section ul {
  margin: 0;
  padding-left: var(--md-sp-4, 16px);
}

.validate-section li {
  font-size: var(--md-fs-xs, 12px);
  color: var(--md-text, #333);
  margin-bottom: 2px;
  word-break: break-all;
}

.close-btn {
  position: absolute;
  top: var(--md-sp-2, 8px);
  right: var(--md-sp-2, 8px);
  border: none;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  color: var(--md-text-secondary, #888);
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: var(--md-text, #333);
}
</style>
