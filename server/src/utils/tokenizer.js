/**
 * 中文分词工具（FTS5 方案A：unicode61 + 预分词）
 *
 * 背景：trigram 分词器按 3 字符滑窗切词，2 字中文词（考研/打球/开黑）无法命中，
 * 且 ftsWords 被迫过滤 ≥3 字词导致 2 字词全部退化为 LIKE 全表扫描。
 *
 * 方案：索引侧与查询侧统一用本工具预分词，FTS5 表改 unicode61（按空格切分）：
 * - 连续汉字段 ≤4 字：整词入索引（"考研"成为独立 token，直接 MATCH 命中）
 * - 连续汉字段 >4 字：滑窗 bigram（"广州游玩当灯泡" -> "广州 州游 游玩 玩当 当灯 灯泡"）
 * - 非汉字词（英文/数字）保留原样小写
 *
 * 查询侧语义：词的 bigram 展开用 OR 连接（宽松召回，FTS5 rank 自动给完整词更高权重）。
 * 例：查询"打游戏" -> "打游戏 打游 游戏"，索引含任一 token 即召回。
 */

// 提取文本的全部 token（Set 去重）
function extractTokens(text) {
  const tokens = new Set()
  const hanSegments = String(text || '').match(/[\u4e00-\u9fa5]+/g) || []
  for (const seg of hanSegments) {
    if (seg.length <= 4) {
      // 短段整词入索引（≤4 字的连续汉字整体作为一个 token）
      tokens.add(seg)
    } else {
      // 长段滑窗 bigram（保留子串匹配能力，如"广州游玩当灯泡"中的"游玩"）
      for (let i = 0; i < seg.length - 1; i++) tokens.add(seg.slice(i, i + 2))
    }
  }
  // 非汉字词（英文/数字/混合），unicode61 原生支持，保留小写
  const nonHan = String(text || '').replace(/[\u4e00-\u9fa5]+/g, ' ').split(/\s+/).filter(Boolean)
  for (const w of nonHan) tokens.add(w.toLowerCase())
  return tokens
}

/**
 * 索引侧分词：文本 -> 空格分隔的 token 串（写入 FTS5 列）
 * @param {string} text 原始文本（keywords 或 summary）
 * @returns {string} 空格分隔 token
 */
export function tokenizeZh(text) {
  return [...extractTokens(text)].join(' ')
}

/**
 * 查询侧转 FTS5 查询串：多个查询词 -> "token1 OR token2 OR ..."
 * @param {string[]} rawWords 查询词数组（如 ['考研', '研究生']）
 * @returns {string} FTS5 MATCH 表达式
 */
export function buildFtsQuery(rawWords) {
  const all = new Set()
  for (const w of rawWords || []) {
    for (const t of extractTokens(w)) all.add(t)
  }
  return [...all].join(' OR ')
}
