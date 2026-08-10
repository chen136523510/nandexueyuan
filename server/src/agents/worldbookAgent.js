/**
 * 世界书 Agent：按需加载德塔世界观设定集全文
 *
 * 当用户问到德塔/世界观/角色设定/势力/历史等设定相关问题时，
 * orchestrator 会派发 worldbook 任务，本 Agent 读取设定集全文注入上下文。
 */

import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 设定集 v1.4（唯一权威设定文档）
// server/src/agents/ -> 回退三级到项目根 -> prd/...
const WORLDBOOK_PATH = path.resolve(
  __dirname, '..', '..', '..', 'prd', '01-需求文档', '04-德塔', '02-设计', '世界观', '设定集-v1.4.md'
)

/**
 * 读取设定集全文
 */
export async function runWorldbookAgent(task, emit) {
  emit('worldbook', 'searching', '正在读取德塔世界观设定集...')

  let content
  try {
    content = fs.readFileSync(WORLDBOOK_PATH, 'utf-8')
  } catch (err) {
    return {
      ok: false,
      error: `读取设定集失败: ${err.message}`,
      agentType: '世界书',
    }
  }

  const charCount = content.length
  emit('worldbook', 'done', `已加载设定集 v1.4（${charCount} 字符）`)

  return {
    ok: true,
    agentType: '世界书',
    summary: `德塔世界观设定集 v1.4 全文（${charCount} 字符）`,
    formattedText: content,
    count: 1,
  }
}
