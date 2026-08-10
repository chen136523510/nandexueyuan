/**
 * Markdown 渲染封装（安全配置）
 *
 * 用于 AI 回复的 Markdown 渲染，禁用原始 HTML，限制链接协议，
 * 防止 XSS。流式输出时每次调用 renderMarkdown 即可。
 */
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

// 安全配置：禁用 HTML 原始标签，仅允许 http/https 链接
const md = new MarkdownIt({
  html: false, // 禁用 HTML 标签
  linkify: true, // 自动识别链接
  typographer: false, // 不做排版替换（避免中文标点被改）
  breaks: true, // 单换行转 <br>
})

// 限制链接协议 + 添加 target="_blank" rel="noopener"
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx]
  const hrefIndex = token.attrIndex('href')
  if (hrefIndex >= 0) {
    const href = token.attrs[hrefIndex][1]
    // 只允许 http/https 协议，阻止 javascript: data: 等
    if (!/^https?:\/\//i.test(href)) {
      token.attrs[hrefIndex][1] = '#'
    }
  }
  token.attrPush(['target', '_blank'])
  token.attrPush(['rel', 'noopener noreferrer'])
  return defaultLinkOpen(tokens, idx, options, env, self)
}

/**
 * 将 Markdown 文本渲染为安全的 HTML 字符串
 * @param {string} text Markdown 原文
 * @returns {string} 安全的 HTML 字符串
 */
export function renderMarkdown(text) {
  if (!text) return ''
  const html = md.render(text)
  // DOMPurify 二次过滤，确保无 XSS
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'del', 'code', 'pre',
      'ul', 'ol', 'li', 'blockquote', 'a', 'table',
      'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}
