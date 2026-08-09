#!/usr/bin/env node
/**
 * 前端可访问性 + 测试钩子检查脚本（零依赖）
 *
 * 规则：所有 <button> 如果没有可见文字（或只有符号/emoji），必须带 aria-label 或 data-testid。
 * 有完整可见文字的按钮豁免 aria-label（文字本身就是 accessible name）。
 *
 * 用法：node scripts/check-a11y.mjs
 * npm：  npm run lint:a11y
 *
 * 退出码：0=通过，1=有违规
 *
 * 关联规范：prd/01-需求文档/04-德塔/02-设计/技术设计/前端可访问性与测试钩子规范.md
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'fs'
import { join, extname, relative } from 'path'

const SRC_DIR = join(process.cwd(), 'src')
const IGNORE_FILE = join(process.cwd(), '.a11y-ignore')
const SYMBOLS = new Set(['✕', '×', '✖', '▶', '◀', '▲', '▼', '◆', '●', '○', '■', '□', '★', '☆', '→', '←', '↑', '↓'])

let violations = 0
let checked = 0
let ignored = 0

/**
 * 加载白名单（.a11y-ignore）
 * 格式：每行一条 `相对路径:行号`，# 开头为注释
 * 白名单内的违规降级为 WARN（不阻断退出码）
 */
function loadIgnoreList() {
  if (!existsSync(IGNORE_FILE)) return new Map()
  const content = readFileSync(IGNORE_FILE, 'utf-8')
  const ignoreMap = new Map()  // Map<relPath, Set<lineNum>>
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [relPath, lineStr] = trimmed.split(':')
    if (!relPath || !lineStr) continue
    const lineNum = parseInt(lineStr, 10)
    if (!lineNum) continue
    const normalized = relPath.replace(/\\/g, '/')  // 统一用正斜杠
    if (!ignoreMap.has(normalized)) ignoreMap.set(normalized, new Set())
    ignoreMap.get(normalized).add(lineNum)
  }
  return ignoreMap
}

const ignoreList = loadIgnoreList()

/** 判断某文件的某行是否在白名单 */
function isIgnored(relPath, lineNum) {
  const normalized = relPath.replace(/\\/g, '/')
  const lines = ignoreList.get(normalized)
  return lines ? lines.has(lineNum) : false
}

/** 递归收集 src 下所有 .vue 文件 */
function collectVueFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...collectVueFiles(full))
    } else if (extname(entry) === '.vue') {
      files.push(full)
    }
  }
  return files
}

/**
 * 判断按钮内容是否有可见文字（非符号/emoji）
 * 粗略判断：去掉 HTML 标签后，如果剩余文本里有非符号非 emoji 的字符，算有可见文字
 */
function hasVisibleText(content) {
  // 去掉所有 HTML 标签
  const text = content.replace(/<[^>]*>/g, '').trim()
  if (!text) return false
  // 逐字符检查，只要有任意一个非符号非 emoji 字符就算有可见文字
  for (const char of text) {
    if (!SYMBOLS.has(char) && !isEmoji(char) && char.trim()) {
      return true
    }
  }
  return false
}

/** 粗略判断是否是 emoji（非 ASCII 字符且非常见符号） */
function isEmoji(char) {
  const code = char.codePointAt(0)
  // 常见 emoji 范围：杂项符号(2600-26FF)、补充符号(1F300+)、表情符号(1F600+) 等
  return (
    (code >= 0x1f300 && code <= 0x1faff) ||
    (code >= 0x2600 && code <= 0x27bf) ||
    (code >= 0x2190 && code <= 0x21ff) || // 箭头
    (code >= 0x2300 && code <= 0x23ff)    // 杂项技术符号
  )
}

/**
 * 提取并检查单个 .vue 文件中的所有 <button>
 * 处理多行 button 标签，逐个提取 button 元素的完整 HTML
 */
function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const relPath = relative(process.cwd(), filePath)

  // 用正则提取所有 <button ...>...</button>（含跨行，非贪婪）
  const buttonRegex = /<button\b([^]*?)>([^]*?)<\/button>/g
  let match

  while ((match = buttonRegex.exec(content)) !== null) {
    checked++
    const attrs = match[1] || ''
    const innerContent = match[2] || ''

    // 检查是否有 aria-label 或 data-testid（注意 Vue 动态绑定 :aria-label / :data-testid）
    const hasAriaLabel = /\baria-label\b/.test(attrs) || /:aria-label\b/.test(attrs)
    const hasTestId = /\bdata-testid\b/.test(attrs) || /:data-testid\b/.test(attrs)

    if (hasAriaLabel || hasTestId) continue  // 满足要求

    // 如果有可见文字，只 warn 不 error（文字本身就是 accessible name）
    if (hasVisibleText(innerContent)) {
      // 找到行号
      const lineNum = content.slice(0, match.index).split('\n').length
      console.log(`  ⚠️  WARN  ${relPath}:${lineNum} - 按钮有可见文字但缺 data-testid（建议补充以稳定测试定位）`)
      continue
    }

    // 无可见文字且无 aria-label/data-testid -> 违规
    const lineNum = content.slice(0, match.index).split('\n').length
    if (isIgnored(relPath, lineNum)) {
      console.log(`  ⏭️  SKIP  ${relPath}:${lineNum} - 图标按钮缺属性（已加入白名单，待渐进迁移）`)
      ignored++
    } else {
      console.log(`  ❌ ERROR ${relPath}:${lineNum} - 图标按钮缺少 aria-label 或 data-testid`)
      violations++
    }
  }
}

// ===== 主流程 =====
console.log('🔍 扫描 src/ 下所有 .vue 文件的可访问性...\n')

const files = collectVueFiles(SRC_DIR)
for (const file of files) {
  checkFile(file)
}

console.log(`\n📊 检查了 ${files.length} 个文件，${checked} 个 <button> 元素，${ignored} 个白名单豁免`)

if (violations > 0) {
  console.log(`\n❌ 发现 ${violations} 个违规：图标按钮缺少 aria-label 或 data-testid`)
  console.log('   规范文档：prd/01-需求文档/04-德塔/02-设计/技术设计/前端可访问性与测试钩子规范.md')
  console.log('   已知待迁移项可加入 .a11y-ignore 白名单（格式：相对路径:行号）')
  process.exit(1)
} else {
  console.log('\n✅ 全部通过（图标按钮均有 aria-label 或 data-testid，或已加入白名单）')
  process.exit(0)
}
