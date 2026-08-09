import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 配置
 *
 * 三大测试痛点原生解决：
 * 1. HTTPS 自签名证书 -> use.ignoreHTTPSErrors = true（全局忽略）
 * 2. 原生弹窗 -> tests/e2e/fixtures.js 的 autoAcceptDialogs fixture
 * 3. 图标按钮定位 -> tests/e2e/utils.js 的 clickIconBtn（走 aria-label / data-testid）
 *
 * 本地模式：自动起 vite dev server（4396），测试 http://localhost:4396
 * 线上模式：设 E2E_BASE_URL=https://www.nandexueyuan.top，测试线上（自动跳过 webServer）
 *
 * 关联规范：prd/01-需求文档/04-德塔/02-设计/技术设计/前端可访问性与测试钩子规范.md
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // 痛点1：全局忽略 HTTPS 证书错误（自签名/staging 环境）
    ignoreHTTPSErrors: true,
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4396',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 本地模式自动起 dev server；线上模式（E2E_BASE_URL 已设）自动跳过
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:4396',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
