/**
 * 岁月史书·剧情编辑器 -- 转换层（纯函数）
 *
 * 职责：现有剧本（逻辑骨架 + 文案 script）<-> Vue Flow 画布数据 双向转换 + 静态校验。
 * 引擎层（engine.js / visualNovelStore.js）零改动，编辑器产出可直接回写 data/scripts/ 文件。
 *
 * 数据流向：
 *   导入：skeleton[] + scriptNodes[] --merge--> 运行时节点 --nodesToFlow--> { nodes, edges }
 *   导出：画布 nodes --flowToScriptFile--> .script.js 源码（文案）/ .js 源码（骨架，二期）
 *   校验：validate() 检死链/id 重复/文案 id 不匹配/choice 下标不齐
 */

// ============ 导入：剧本 -> Vue Flow ============

/**
 * 把「骨架节点数组 + 文案节点数组」转成 Vue Flow 的 nodes/edges。
 * 文案合并逻辑与 engine.js 的 mergeScript 一致（text/placeholder 覆盖、choices 按下标替换 text）。
 *
 * @param {Array} skeleton 逻辑骨架节点数组（prologue.js / chapter1.js 的 default export）
 * @param {Array} scriptNodes 文案节点数组（data/scripts/*.script.js 的 default export，可多个 flat）
 * @returns {{ nodes: Array, edges: Array, warnings: Array }}
 */
export function nodesToFlow(skeleton, scriptNodes) {
  const warnings = []

  // 1. 合并文案（复刻 mergeScript 语义）
  const textMap = new Map()
  for (const t of scriptNodes || []) {
    if (t && t.id) {
      if (textMap.has(t.id)) warnings.push(`文案 id 重复：${t.id}（后者覆盖前者）`)
      textMap.set(t.id, t)
    }
  }

  // 2. 骨架节点 -> Flow node（data 字段挂运行时视角的完整节点）
  const nodes = skeleton.map(node => {
    const t = textMap.get(node.id)
    const data = { ...node }
    if (t) {
      if ('text' in t) data.text = t.text
      if ('placeholder' in t) data.placeholder = t.placeholder
      if (t.choices && Array.isArray(node.choices)) {
        data.choices = node.choices.map((c, i) => ({ ...c, text: t.choices[i] ?? c.text }))
      }
    }
    // 跨章跳转标记（event 节点 unlockChapter 且 next 空 = 跳新章节的终点）
    if (node.type === 'event' && node.unlockChapter && !node.next) {
      data.isChapterJump = true
    }
    return {
      id: node.id,
      type: node.type,        // 用剧本节点类型直接当 Flow 自定义节点名
      position: { x: 0, y: 0 }, // 坐标由 dagre 自动布局填充
      data,
    }
  })

  // 3. 出边收集：next / choices[].next / branches[].next / hotspots[].action.target
  // Handle id 约定：choice -> `choice-${i}`，condition -> `branch-${i}`，其余默认
  // 多分支可视区分：①label 只放序号（①②③…）不放选项长文案（连线上一堆字看着费劲）
  //                ②stroke 按出口序号循环高区分色
  const EDGE_COLORS = ['#5B8DB8', '#C98B5E', '#8B7BC7', '#5EA89B', '#C75E7B', '#8FA35E']
  const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
  const edges = []
  const pushEdge = (source, target, label, kind, extra = {}) => {
    edges.push({
      id: `e_${source}_${target}_${edges.length}`,
      source,
      target,
      label,
      type: 'smoothstep',
      animated: kind === 'hotspot',
      ...extra,
    })
  }

  for (const node of skeleton) {
    if (node.next) {
      pushEdge(node.id, node.next, '', 'next', {
        style: { stroke: '#B0B0A8', strokeWidth: 1.5 },
      })
    }
    if (Array.isArray(node.choices)) {
      node.choices.forEach((c, i) => {
        const merged = nodes.find(n => n.id === node.id)?.data.choices?.[i]
        const fullText = merged?.text || c.text || ''
        pushEdge(node.id, c.next, CIRCLED[i] || `${i + 1}`, 'choice', {
          sourceHandle: `choice-${i}`,
          style: { stroke: EDGE_COLORS[i % EDGE_COLORS.length], strokeWidth: 2 },
          labelBgStyle: { fill: '#fff' },
          labelStyle: { fill: EDGE_COLORS[i % EDGE_COLORS.length], fontWeight: '700' },
          data: { impact: c.impact, index: i, text: fullText },
        })
      })
    }
    if (Array.isArray(node.branches)) {
      node.branches.forEach((b, i) => {
        const label = b.else ? '否则' : formatCondition(b.if)
        pushEdge(node.id, b.next, label, 'branch', {
          sourceHandle: `branch-${i}`,
          style: { stroke: EDGE_COLORS[i % EDGE_COLORS.length], strokeWidth: 2 },
          labelBgStyle: { fill: '#fff' },
          data: { index: i },
        })
      })
    }
    if (Array.isArray(node.hotspots)) {
      node.hotspots.forEach((h, i) => {
        if (h.action?.type === 'goto' && h.action.target) {
          pushEdge(node.id, h.action.target, `热点:${h.label}`, 'hotspot', { data: { index: i } })
        }
      })
    }
  }

  return { nodes, edges, warnings }
}

/** 条件对象转可读表达式（{ rui: '>=80' } -> 「睿好感≥80」） */
function formatCondition(cond) {
  if (!cond) return '条件'
  const parts = []
  for (const [key, rule] of Object.entries(cond)) {
    if (key === 'variables') {
      for (const [vk, vv] of Object.entries(rule)) {
        parts.push(`${vk}=${vv}`)
      }
    } else {
      parts.push(`${key}${rule}`)
    }
  }
  return parts.join(' 且 ') || '条件'
}

// ============ dagre 自动布局 ============

/**
 * 层次自动布局（LR 从左到右）。手写剧本没有坐标，必须自动排版。
 * dagre 由调用方 import 后传入（保持本模块纯 ESM，node 直跑验证不依赖打包器）。
 * @param {Array} nodes Vue Flow nodes
 * @param {Array} edges Vue Flow edges
 * @param {object} dagre @dagrejs/dagre 模块实例
 * @returns {Array} 带坐标的 nodes（原数组元素的浅拷贝）
 */
export function layoutWithDagre(nodes, edges, dagre) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 90, marginx: 40, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeWidth = 240
  const nodeHeight = 90

  for (const n of nodes) {
    g.setNode(n.id, { width: nodeWidth, height: nodeHeight })
  }
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 } }
  })
}

// ============ 导出：Vue Flow -> 剧本文件 ============

/**
 * 画布 nodes -> 文案 .script.js 源码（可直接替换 data/scripts/ 下对应文件）。
 * 只导出「文案侧」字段：text / placeholder / choices（纯字符串数组）。
 * 行末注释标说话人，保持院长手改文件的阅读习惯。
 *
 * @param {Array} flowNodes Vue Flow nodes（data 为运行时视角节点）
 * @returns {string} .script.js 文件源码
 */
export function flowToScriptFile(flowNodes) {
  const lines = []
  lines.push('/**')
  lines.push(' * 本文件由岁月史书·剧情编辑器导出（' + new Date().toISOString().slice(0, 10) + '）')
  lines.push(' * 手动修改前建议先备份。id 对应逻辑骨架节点，勿改。')
  lines.push(' */')
  lines.push('')
  lines.push('export default [')

  for (const n of flowNodes) {
    const d = n.data
    if (!d) continue

    // 选项节点：导出 choices 纯字符串数组
    if (Array.isArray(d.choices)) {
      lines.push('  {')
      lines.push(`    id: '${d.id}',`)
      lines.push('    choices: [')
      for (const c of d.choices) {
        lines.push(`      ${jsString(c.text)},`)
      }
      lines.push('    ],')
      lines.push('  },')
      continue
    }

    // 有 text 的节点（dialogue / input）
    if ('text' in d) {
      const comment = d.speaker ? `  // ${d.speaker}` : ''
      const placeholder = 'placeholder' in d ? `, placeholder: ${jsString(d.placeholder)}` : ''
      lines.push(`  { id: '${d.id}', text: ${jsString(d.text)}${placeholder} },${comment}`)
    }
    // 纯逻辑节点（condition/event/end 无 text）不进文案文件
  }

  lines.push(']')
  lines.push('')
  return lines.join('\n')
}

/** JS 字符串字面量（单引号，内部单引号/反斜杠/换行等控制字符全部转义） */
function jsString(s) {
  if (s === undefined || s === null) return "''"
  return `'${String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}'`
}

/**
 * 画布 nodes -> 骨架 .js 源码（二期做完整逻辑编辑后启用；一期导出 JSON 存档用）。
 * 一期提供 JSON 形式：调试/存档/二期导入。
 */
export function flowToSkeletonJson(flowNodes) {
  return JSON.stringify(
    flowNodes.map(n => {
      const { isChapterJump, ...rest } = n.data || {}
      return rest
    }),
    null,
    2
  )
}

// ============ 静态校验 ============

/**
 * 校验画布/剧本数据，返回问题清单（供校验面板展示）。
 * 检查项：next 死链 / id 重复 / choice 下标不齐 / 文案 id 双向匹配。
 *
 * @param {Array} skeleton 逻辑骨架
 * @param {Array} scriptNodes 文案数组
 * @param {Array} [flowNodes] 画布节点（编辑后校验用，缺省用 skeleton）
 * @returns {{ errors: Array, warnings: Array }}
 */
export function validate(skeleton, scriptNodes, flowNodes) {
  const errors = []
  const warnings = []
  const nodes = flowNodes || skeleton
  const idSet = new Set()

  // id 唯一性
  const seen = new Map()
  for (const n of nodes) {
    const id = n.id || n.data?.id
    if (seen.has(id)) {
      errors.push(`id 重复：${id}（与 ${seen.get(id)} 冲突）`)
    } else {
      seen.set(id, true)
    }
    idSet.add(id)
  }

  // 出边目标存在性（死链检测）
  for (const n of nodes) {
    const node = n.data || n
    const checkTarget = (target, desc) => {
      if (target && !idSet.has(target)) {
        errors.push(`死链：${node.id} 的 ${desc} 指向不存在的节点「${target}」`)
      }
    }
    if (node.next) checkTarget(node.next, 'next')
    if (Array.isArray(node.choices)) {
      node.choices.forEach((c, i) => checkTarget(c.next, `选项${i + 1}.next`))
    }
    if (Array.isArray(node.branches)) {
      node.branches.forEach((b, i) => checkTarget(b.next, `分支${i + 1}.next`))
    }
    if (Array.isArray(node.hotspots)) {
      node.hotspots.forEach((h) => {
        if (h.action?.type === 'goto') checkTarget(h.action.target, `热点「${h.label}」target`)
      })
    }
  }

  // choice 下标对齐（文案 choices 数组长度 vs 骨架 choices 长度）
  const skeletonMap = new Map(skeleton.map(n => [n.id, n]))
  for (const t of scriptNodes || []) {
    if (!t || !t.id) continue
    const sk = skeletonMap.get(t.id)
    if (!sk) {
      warnings.push(`文案 id「${t.id}」在骨架中不存在（mergeScript 会静默丢弃）`)
      continue
    }
    if (Array.isArray(t.choices) && Array.isArray(sk.choices) && t.choices.length !== sk.choices.length) {
      warnings.push(`选项数不齐：${t.id} 文案 ${t.choices.length} 项 vs 骨架 ${sk.choices.length} 项`)
    }
  }

  // 骨架有 choice 但文案完全缺失
  for (const sk of skeleton) {
    if (Array.isArray(sk.choices)) {
      const hasText = (scriptNodes || []).some(t => t?.id === sk.id && Array.isArray(t.choices))
      if (!hasText) warnings.push(`choice 节点 ${sk.id} 无文案（运行时显示 undefined 选项文案风险）`)
    }
  }

  return { errors, warnings }
}
