/**
 * Playwright 通用 Fixtures
 *
 * 痛点2解决方案：原生弹窗自动接受
 *
 * 用法（在 spec 文件中 import 这里的 test 而非 @playwright/test）：
 *   import { test, expect } from './fixtures.js'
 *   test('xxx', async ({ page, autoAcceptDialogs }) => { ... })
 *
 * autoAcceptDialogs fixture 会自动注册 dialog 事件监听，
 * 测试期间所有 alert/confirm/prompt 都自动接受（prompt 传空串），
 * 无需在每个测试里手动 page.on('dialog', ...)
 *
 * 关联规范：prd/01-需求文档/04-德塔/02-设计/技术设计/前端可访问性与测试钩子规范.md
 */
import { test as base, expect } from '@playwright/test'

/**
 * autoAcceptDialogs fixture
 *
 * 自动接受页面弹出的原生 dialog（alert/confirm/prompt/beforeunload）：
 * - alert -> dismiss（alert 只有确定，等价于接受）
 * - confirm -> accept（默认点"确定"）
 * - prompt -> accept('')（传空字符串，如需特定值自行 page.on 覆盖）
 * - beforeunload -> accept
 *
 * 场景：测试 views 层仍有 13 处原生 alert/confirm，不处理会阻塞测试。
 */
export const test = base.extend({
  autoAcceptDialogs: async ({ page }, use) => {
    const handler = (dialog) => {
      const type = dialog.type()
      if (type === 'prompt') {
        dialog.accept('')  // prompt 传空字符串
      } else {
        dialog.accept()
      }
    }
    page.on('dialog', handler)
    await use()
    page.off('dialog', handler)
  },
})

export { expect }
