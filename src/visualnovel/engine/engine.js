/**
 * 德塔视觉小说 剧本引擎核心
 *
 * 职责：
 * 1. 加载剧本数据（章节文件），建立节点索引
 * 2. 按 id 查找节点
 * 3. 执行好感度效果
 * 4. 执行条件分支判断
 * 5. 计算"下一节点"（处理 condition/event 的自动跳转）
 *
 * 引擎本身不持有响应式状态，状态管理交给 visualNovelStore。
 * 引擎是纯逻辑函数集合，方便测试和复用。
 */

import { NodeType, ConditionOp } from './types.js'

/**
 * 构建节点索引（id -> node）
 * @param {Array} nodes - 剧本节点数组
 * @returns {Map<string, object>} 节点索引
 */
export function buildIndex(nodes) {
  const index = new Map()
  for (const node of nodes) {
    if (!node.id) {
      console.warn('[Engine] 节点缺少 id，已跳过:', node)
      continue
    }
    if (index.has(node.id)) {
      console.warn(`[Engine] 节点 id 重复: ${node.id}，后者覆盖前者`)
    }
    index.set(node.id, node)
  }
  return index
}

/**
 * 获取节点
 * @param {Map} index - 节点索引
 * @param {string} nodeId - 节点 id
 * @returns {object|null}
 */
export function getNode(index, nodeId) {
  return index.get(nodeId) || null
}

/**
 * 获取剧本的起始节点 id
 * @param {Array} nodes - 剧本节点数组
 * @returns {string|null}
 */
export function getStartNode(nodes) {
  if (!nodes || nodes.length === 0) return null
  return nodes[0].id
}

/**
 * 应用好感度效果
 * @param {object} affinity - 当前好感度对象 { rui: 30, qiu: 50, ... }
 * @param {object} effects - 效果对象 { rui: 5, qiu: -3, ... }
 * @returns {object} 新的好感度对象（不可变更新）
 */
export function applyEffects(affinity, effects) {
  if (!effects) return { ...affinity }
  const result = { ...affinity }
  for (const [key, delta] of Object.entries(effects)) {
    const current = result[key] || 0
    result[key] = Math.max(0, Math.min(100, current + delta))
  }
  return result
}

/**
 * 评估单个条件
 * @param {number} value - 当前值
 * @param {string} op - 运算符
 * @param {number} target - 目标值
 * @returns {boolean}
 */
function evalCondition(value, op, target) {
  switch (op) {
    case ConditionOp.GTE: return value >= target
    case ConditionOp.LTE: return value <= target
    case ConditionOp.GT: return value > target
    case ConditionOp.LT: return value < target
    case ConditionOp.EQ: return value === target
    case ConditionOp.NEQ: return value !== target
    default:
      console.warn(`[Engine] 未知条件运算符: ${op}`)
      return false
  }
}

/**
 * 评估条件分支，返回应该跳转的节点 id
 *
 * condition 节点结构:
 * {
 *   type: 'condition',
 *   branches: [
 *     { if: { rui: '>=80' }, next: 'node_a' },
 *     { if: { variables: { met_faci: true } }, next: 'node_b' },
 *     { else: true, next: 'node_c' }
 *   ]
 * }
 *
 * 按顺序评估，第一个匹配的分支胜出。else 兜底。
 *
 * @param {object} node - condition 节点
 * @param {object} affinity - 当前好感度
 * @param {object} variables - 当前剧情变量
 * @returns {string|null} 下一节点 id
 */
export function evalConditionNode(node, affinity, variables) {
  if (!node.branches || node.branches.length === 0) {
    console.warn('[Engine] condition 节点缺少 branches:', node.id)
    return null
  }
  for (const branch of node.branches) {
    // else 分支
    if (branch.else) {
      return branch.next
    }
    // if 分支：评估所有条件（AND 逻辑）
    if (branch.if) {
      const allMatch = Object.entries(branch.if).every(([key, rawCond]) => {
        // 好感度条件: { rui: '>=80' }
        if (key !== 'variables' && typeof rawCond === 'string') {
          const match = rawCond.match(/^(>=|<=|>|<|==|!=)(\d+)$/)
          if (!match) {
            console.warn(`[Engine] 无法解析条件: ${key}=${rawCond}`)
            return false
          }
          const op = match[1]
          const target = parseInt(match[2], 10)
          const value = affinity[key] || 0
          return evalCondition(value, op, target)
        }
        return true
      })
      // 变量条件: { variables: { met_faci: true } }
      if (allMatch && branch.if.variables) {
        const varMatch = Object.entries(branch.if.variables).every(([vKey, vExpected]) => {
          return variables[vKey] === vExpected
        })
        if (!varMatch) continue
      }
      if (allMatch) return branch.next
    }
  }
  // 没有任何分支匹配，也没有 else
  console.warn('[Engine] condition 节点无分支匹配:', node.id)
  return null
}

/**
 * 获取下一节点 id（处理 event/condition 的自动跳转链）
 *
 * 对于 dialogue 节点：返回 node.next
 * 对于 choice 节点：返回 null（由用户选择决定，不自动跳转）
 * 对于 condition 节点：评估条件后返回结果
 * 对于 event 节点：返回 node.next（事件执行后自动跳转）
 * 对于 end 节点：返回 null（章节结束）
 *
 * @param {object} node - 当前节点
 * @param {Map} index - 节点索引
 * @param {object} affinity - 当前好感度
 * @param {object} variables - 当前剧情变量
 * @param {number} maxDepth - 递归最大深度（防止死循环）
 * @returns {string|null} 下一节点 id
 */
export function getNextNodeId(node, index, affinity, variables, maxDepth = 10) {
  if (!node) return null
  if (maxDepth <= 0) {
    console.warn('[Engine] 递归深度超限，可能存在死循环')
    return null
  }

  switch (node.type) {
    case NodeType.DIALOGUE:
      return node.next || null

    case NodeType.EVENT:
      // event 节点执行完自动跳到 next
      return node.next || null

    case NodeType.CONDITION: {
      const nextId = evalConditionNode(node, affinity, variables)
      if (nextId) {
        // 递归处理连续的 condition/event 链
        const nextNode = getNode(index, nextId)
        if (nextNode && (nextNode.type === NodeType.CONDITION || nextNode.type === NodeType.EVENT)) {
          return getNextNodeId(nextNode, index, affinity, variables, maxDepth - 1)
        }
      }
      return nextId
    }

    case NodeType.CHOICE:
      // 选项节点不自动跳转，等待用户选择
      return null

    case NodeType.INPUT:
      // 输入节点不自动跳转，等待用户提交
      return null

    case NodeType.END:
      return null

    default:
      console.warn(`[Engine] 未知节点类型: ${node.type}`)
      return node.next || null
  }
}

/**
 * 执行 event 节点的副作用（解锁CG、修改变量、发放物品等）
 * @param {object} node - event 节点
 * @param {object} variables - 当前剧情变量
 * @param {Array} unlockedCGs - 已解锁CG列表
 * @returns {object} { variables, unlockedCGs, cg, grantedItem, unlockedChapter } 更新后的状态
 */
export function executeEvent(node, variables, unlockedCGs) {
  const newVars = { ...variables }
  const newCGs = [...unlockedCGs]
  let triggeredCG = null
  let grantedItem = null
  let unlockedChapter = null

  // 解锁 CG
  if (node.unlockCG && !newCGs.includes(node.unlockCG)) {
    newCGs.push(node.unlockCG)
    triggeredCG = node.unlockCG
  }

  // 解锁章节
  if (node.unlockChapter) {
    unlockedChapter = node.unlockChapter
  }

  // 修改变量
  if (node.setVariables) {
    Object.assign(newVars, node.setVariables)
  }

  // 发放物品
  if (node.grantItem) {
    grantedItem = node.grantItem
  }

  return { variables: newVars, unlockedCGs: newCGs, cg: triggeredCG, grantedItem, unlockedChapter }
}

/**
 * 文案合并：把外部文案注入剧本骨架节点（按 id 匹配）
 *
 * 背景：剧本的「逻辑」（type/background/characters/next/effects/branches...）
 * 与「文案」（text/choices/placeholder）分离维护。prologue.js 是逻辑骨架，
 * scripts/*.script.js 是文案。本函数在加载时按 id 合并，返回完整节点数组。
 *
 * 合并规则：
 *   - text/placeholder：文案存在则覆盖骨架
 *   - choices：按下标对应，只覆盖每项的 text（impact/next/effects 保留骨架的）
 *   - 骨架里没有对应文案的节点：原样返回（如纯逻辑节点 condition/event/end）
 *   - 文案里多出的 id（骨架没有）：忽略并告警（通常是文案写错了 id）
 *
 * @param {Array} nodes - 剧本逻辑骨架（prologue.js）
 * @param {Array} scriptNodes - 文案节点数组（scripts/*.script.js 合并）
 * @returns {Array} 合并后的完整节点数组
 */
export function mergeScript(nodes, scriptNodes) {
  const textMap = new Map()
  for (const t of scriptNodes) {
    if (t && t.id) {
      if (textMap.has(t.id)) {
        console.warn(`[Engine] mergeScript 文案 id 重复: ${t.id}，后者覆盖前者`)
      }
      textMap.set(t.id, t)
    }
  }

  return nodes.map(node => {
    const t = textMap.get(node.id)
    if (!t) return node
    const merged = { ...node }
    if ('text' in t) merged.text = t.text
    if ('placeholder' in t) merged.placeholder = t.placeholder
    // 选项文案按下标对应：只替换 text，保留 impact/next/effects
    if (t.choices && Array.isArray(node.choices)) {
      merged.choices = node.choices.map((c, i) => ({
        ...c,
        text: t.choices[i] ?? c.text,
      }))
    }
    return merged
  })
}

/**
 * 通用文本插值：把 {变量名} 替换为实际值
 *
 * 支持任意变量名（如 {playerName}、{affinity}）。
 * 未找到的变量原样保留占位符（便于发现配置错误）。
 *
 * @param {string} text - 原始文案（可能含 {playerName} 等占位符）
 * @param {object} variables - 变量字典（如 { playerName: '阿明', rui: 30 }）
 * @returns {string} 替换后的文案
 */
export function interpolate(text, variables) {
  if (!text) return ''
  if (!variables) return text
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key]
    return value !== undefined && value !== null ? String(value) : match
  })
}
