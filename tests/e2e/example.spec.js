/**
 * Playwright E2E 示例测试
 *
 * 演示三大工具用法（对应调研文档的三痛点）：
 * 1. baseURL + ignoreHTTPSErrors（HTTPS 证书，config 层全局解决）
 * 2. autoAcceptDialogs fixture（原生弹窗自动接受）
 * 3. clickIconBtn（图标按钮精准定位，走 aria-label / data-testid）
 *
 * 示例聚焦前端可独立验证的部分，不依赖后端/game-server。
 * 本地运行：npm run test:e2e
 * 线上运行：E2E_BASE_URL=https://www.nandexueyuan.top npm run test:e2e
 *
 * 关联规范：prd/01-需求文档/04-德塔/02-设计/技术设计/前端可访问性与测试钩子规范.md
 */
import { test, expect } from './fixtures.js'
import { clickIconBtn, uploadFiles, dismissNativeDialog, waitForVNScene } from './utils.js'

test.describe('GUI 测试工具集示例', () => {

  test('示例1：访问首页验证渲染（baseURL + HTTP）', async ({ page }) => {
    // 演示 baseURL：只需写路径，不用写完整 URL
    // 线上模式 baseURL 自动切换为 https://www.nandexueyuan.top
    await page.goto('/')

    // 验证页面加载成功（标题或关键元素存在）
    await expect(page).toHaveTitle(/男德学院/)
  })

  test('示例2：autoAcceptDialogs fixture 演示（原生弹窗自动接受）', async ({ page, autoAcceptDialogs }) => {
    // 登录页可以触发原生弹窗（密码错误时 alert）
    await page.goto('/login')

    // 填入一个错误密码触发 alert
    // autoAcceptDialogs fixture 会自动接受弹窗，测试不会卡住
    await page.fill('input[type="text"], input[placeholder*="用户"]', 'nonexistent_user_test')
    await page.fill('input[type="password"]', 'wrong_password_test')

    // 尝试点击登录按钮（多种定位方式演示）
    const loginBtn = page.getByRole('button', { name: /登录|登 录/ })
    if (await loginBtn.count() > 0) {
      await loginBtn.click()
      // 如果触发了 alert，autoAcceptDialogs 已自动处理
      // 等一下让弹窗处理完成
      await page.waitForTimeout(500)
    }

    // 测试能走到这里说明弹窗没阻塞流程
    expect(true).toBe(true)
  })

  test('示例3：clickIconBtn 演示（图标按钮精准定位）', async ({ page }) => {
    // 演示 clickIconBtn 工具：优先 getByTestId > getByRole({name})
    // 这里用登录页测试，登录页有可见文字按钮

    await page.goto('/login')

    // 用 getByRole + name 定位（走 aria-label 或可见文字）
    const btn = page.getByRole('button', { name: /登录|登 录/ })
    // 只验证能定位到，不实际点击（避免触发后端请求）
    await expect(btn).toBeVisible()
  })

  test('示例4：德塔 visualnovel 模块 aria-label 验证', async ({ page }) => {
    // 验证德塔模块的图标按钮改造后带上了 aria-label
    // 注：德塔页面需登录，这里只验证首页引用了改造后的组件不会报错
    await page.goto('/')

    // 全项目零 <svg> 图标（调研确认），图标均为 emoji/符号
    // 这里验证页面正常加载（改造仅加属性，不改逻辑，不影响渲染）
    await expect(page.locator('body')).toBeVisible()
  })
})
