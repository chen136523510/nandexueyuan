/**
 * Playwright E2E 工具函数
 *
 * 痛点3解决方案：图标按钮精准定位 + 多类型文件上传
 *
 * 关联规范：prd/01-需求文档/04-德塔/02-设计/技术设计/前端可访问性与测试钩子规范.md
 * 关联调研：prd/01-需求文档/00-调研/GUI自动化测试与前端可访问性调研.md
 */

/**
 * 点击图标按钮（无可见文字的按钮）
 *
 * 定位优先级（稳定性从高到低，遵循规范第五章）：
 *   1. data-testid -> getByTestId（最稳定，不受文案/结构变动影响）
 *   2. aria-label -> getByRole('button', { name }）（语义化，走无障碍属性）
 *   3. 文字 -> getByText（有可见文字时兜底）
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} options
 * @param {string} [options.testId] - data-testid 值（推荐，优先使用）
 * @param {string} [options.name] - aria-label 值（次选）
 * @param {string} [options.text] - 按钮可见文字（兜底）
 * @returns {Promise<void>}
 */
export async function clickIconBtn(page, { testId, name, text } = {}) {
  let locator
  if (testId) {
    locator = page.getByTestId(testId)
  } else if (name) {
    locator = page.getByRole('button', { name })
  } else if (text) {
    locator = page.getByText(text, { exact: true })
  } else {
    throw new Error('clickIconBtn 需要至少传 testId / name / text 中的一个')
  }
  await locator.click()
}

/**
 * 文件上传（多类型文件，处理 hidden input）
 *
 * 项目中文件上传用 hidden input + label 触发（如 WallView 图片上传），
 * Playwright 的 setInputFiles 可直接操作 hidden input，无需先取消 hidden。
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - input[type=file] 的 CSS 选择器或 testid
 * @param {string[]} filePaths - 文件路径数组（相对项目根目录）
 * @returns {Promise<void>}
 */
export async function uploadFiles(page, selector, filePaths) {
  // 支持 data-testid 简写：传入 'testid:xxx' 自动转为 getByTestId
  let locator
  if (selector.startsWith('testid:')) {
    locator = page.getByTestId(selector.slice(7))
  } else {
    locator = page.locator(selector)
  }
  await locator.setInputFiles(filePaths)
}

/**
 * 手动接受单个原生弹窗（与 autoAcceptDialogs fixture 互斥时使用）
 *
 * 场景：autoAcceptDialogs fixture 已全局注册 dialog 监听，
 * 但某些测试需要根据弹窗内容做断言（如验证 confirm 的提示文字），
 * 此时不用 autoAcceptDialogs fixture，改用此函数手动处理。
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [options]
 * @param {boolean} [options.accept=true] - true=接受(确定), false=取消
 * @param {string} [options.promptText=''] - prompt 弹窗的输入值
 * @returns {Promise<string>} dialog 的提示文字（供断言用）
 */
export async function dismissNativeDialog(page, { accept = true, promptText = '' } = {}) {
  return new Promise((resolve) => {
    page.once('dialog', async (dialog) => {
      const message = dialog.message()
      if (dialog.type() === 'prompt') {
        await dialog.accept(promptText)
      } else if (accept) {
        await dialog.accept()
      } else {
        await dialog.dismiss()
      }
      resolve(message)
    })
  })
}

/**
 * 等待视觉小说场景加载完成
 *
 * 场景：德塔进游戏后有预加载遮罩，需等遮罩消失后再交互。
 * 通过检测 .game-stage 或 .dialogue-box 是否可见判断加载完成。
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=15000]
 */
export async function waitForVNScene(page, timeout = 15000) {
  await page.waitForSelector('.game-stage', { timeout })
  // 等预加载遮罩消失（如果有）
  await page.waitForSelector('.loading-overlay', { state: 'hidden', timeout }).catch(() => {})
}
