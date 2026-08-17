// @ts-check
import { test, expect } from '@playwright/test'

/**
 * 星河问（FortuneCard）专项测试
 *
 * 覆盖：登录 -> 大厅布局（词云 8 列 + 星河问 4 列）-> 今日运势内容完整性
 *      -> 星座分析 tab/12 宫切换/生日登记/本命标记 -> 深色主题无回归
 * 关联：src/components/FortuneCard.vue / src/utils/fortune.js
 */

const USER = 'chenzijian'
const PASS = 'czj136523510'

test.describe('星河问运势模块', () => {
  test.beforeEach(async ({ page }) => {
    // 登录取 token：页面上下文内同源 fetch（page.request 走独立网络栈，会被本机代理 fake-IP 劫持超时）
    await page.goto('/login')
    const token = await page.evaluate(async ([u, p]) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      })
      return (await res.json()).data.token
    }, [USER, PASS])
    await page.evaluate((t) => {
      localStorage.setItem('token', t)
    }, token)
    await page.goto('/home')
    await expect(page.getByRole('heading', { name: '男德通' })).toBeVisible()
    await page.evaluate(() => localStorage.removeItem('nde-birth-md'))
    await page.reload()
    await expect(page.getByRole('heading', { name: '男德通' })).toBeVisible()
  })

  test('今日运势：星级/宜忌/幸运项/三维条/签语齐全且同人恒定', async ({ page }) => {
    const card = page.locator('.fortune-card')
    await expect(card).toBeVisible()

    // tab 默认今日运势
    await expect(card.getByRole('tab', { name: '今日运势' })).toHaveAttribute('aria-selected', 'true')

    // 星级（2~5 星，★/☆ 组合共 5 字符）+ 当天日期
    const stars = card.locator('.ft-stars')
    await expect(stars).toBeVisible()
    const starText = await stars.innerText()
    expect(starText).toMatch(/^[★☆]{5}$/)
    const starCount = (starText.match(/★/g) || []).length
    expect(starCount).toBeGreaterThanOrEqual(2)
    expect(starCount).toBeLessThanOrEqual(5)
    await expect(card.locator('.ft-date')).toHaveText(/^\d{4}-\d{2}-\d{2}$/)

    // 宜忌各 2 项（标签与内容分行，用 [\s\S] 跨行匹配）
    await expect(card.locator('.ft-yi .ft-tag')).toHaveText('宜')
    await expect(card.locator('.ft-ji .ft-tag')).toHaveText('忌')
    expect(await card.locator('.ft-yi').innerText()).toMatch(/宜[\s\S]+/)
    expect(await card.locator('.ft-ji').innerText()).toMatch(/忌[\s\S]+/)

    // 幸运数字 + 幸运色（色块+名称）
    await expect(card.locator('.ft-lucky-row')).toContainText('幸运数字')
    await expect(card.locator('.ft-lucky-row')).toContainText('幸运色')
    await expect(card.locator('.ft-color-dot')).toBeVisible()

    // 三维运势条 40~98
    const bars = card.locator('.ft-bar-row')
    expect(await bars.count()).toBe(3)
    for (let i = 0; i < 3; i++) {
      const num = Number(await bars.nth(i).locator('.ft-bar-num').innerText())
      expect(num).toBeGreaterThanOrEqual(40)
      expect(num).toBeLessThanOrEqual(98)
    }

    // 签语带「」包裹
    await expect(card.locator('.ft-verse')).toHaveText(/「.+」/)

    // 确定性：刷新后同人同天结果一致
    const before = await card.locator('.ft-body').innerText()
    await page.reload()
    await expect(page.getByRole('heading', { name: '男德通' })).toBeVisible()
    const after = await page.locator('.fortune-card .ft-body').innerText()
    expect(after).toBe(before)
  })

  test('星座分析：12 宫选择器 + 切换生效 + 生日登记本命标记', async ({ page }) => {
    const card = page.locator('.fortune-card')
    await card.getByRole('tab', { name: '星座分析' }).click()

    // 12 个星座按钮 + 默认无选中（未登记生日）
    const zBtns = card.locator('.ft-zodiac-btn')
    expect(await zBtns.count()).toBe(12)
    expect(await card.locator('.ft-zodiac-btn.active').count()).toBe(0)

    // 切换到狮子座（aria-label 定位）
    await card.getByRole('button', { name: '狮子座' }).click()
    await expect(card.locator('.ft-zodiac-name')).toHaveText(/^狮子座/)
    await expect(card.locator('.ft-zodiac-range')).toHaveText('7.23 - 8.22')
    expect(await card.locator('.ft-mood').innerText()).toBeTruthy()

    // 综合指数 40~98，四条进度条
    const mainNum = Number(await card.locator('.ft-bar-row').first().locator('.ft-bar-num').innerText())
    expect(mainNum).toBeGreaterThanOrEqual(40)
    expect(mainNum).toBeLessThanOrEqual(98)
    expect(await card.locator('.ft-bar-row').count()).toBe(4)

    // 生日登记：选 8 月 17 日 -> 狮子座自动成为本命
    await card.locator('.ft-birth-btn').click()
    await card.getByLabel('出生月份').selectOption('8')
    await card.getByLabel('出生日期').selectOption('17')
    await card.getByRole('button', { name: '保存' }).click()

    // 本命 badge + 按钮回显生日 + 本命宫有金色角标
    await expect(card.locator('.ft-mine-badge')).toHaveText('我的')
    await expect(card.locator('.ft-birth-btn')).toContainText('8 月 17 日')
    await expect(card.locator('.ft-zodiac-btn.mine')).toHaveCount(1)

    // 刷新后生日持久化
    await page.reload()
    await expect(page.getByRole('heading', { name: '男德通' })).toBeVisible()
    const card2 = page.locator('.fortune-card')
    await card2.getByRole('tab', { name: '星座分析' }).click()
    await expect(card2.locator('.ft-birth-btn')).toContainText('8 月 17 日')
    await expect(card2.locator('.ft-zodiac-btn.mine')).toHaveCount(1)
  })

  test('布局：词云 8 列 + 星河问 4 列（桌面）；1023px 以下全宽', async ({ page }) => {
    // 桌面：两卡同排
    const wcCol = await page.evaluate(() => getComputedStyle(document.querySelector('.wc-card')).gridColumn)
    const ftCol = await page.evaluate(() => getComputedStyle(document.querySelector('.fortune-card')).gridColumn)
    expect(wcCol).toContain('span 8')
    expect(ftCol).toContain('span 4')

    // 窄屏：转全宽
    await page.setViewportSize({ width: 800, height: 900 })
    const wcColN = await page.evaluate(() => getComputedStyle(document.querySelector('.wc-card')).gridColumn)
    const ftColN = await page.evaluate(() => getComputedStyle(document.querySelector('.fortune-card')).gridColumn)
    expect(wcColN).toContain('span 12')
    expect(ftColN).toContain('span 12')
  })

  test('深色模式：星河问卡片无回归（背景/文字 token 生效）', async ({ page }) => {
    // 切到深色主题（走主题开关或直接设 data-theme）
    await page.evaluate(() => {
      localStorage.setItem('nde-theme', 'dark')
    })
    await page.reload()
    await expect(page.getByRole('heading', { name: '男德通' })).toBeVisible()

    const card = page.locator('.fortune-card')
    await expect(card).toBeVisible()

    // 卡片背景应为深色系（非纯白）
    const bg = await page.evaluate(() => {
      const el = document.querySelector('.fortune-card')
      return getComputedStyle(el).backgroundColor
    })
    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    expect(m).toBeTruthy()
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])]
    expect(r).toBeLessThan(80)
    expect(g).toBeLessThan(80)
    expect(b).toBeLessThan(80)

    // 深色下文字仍可读（标题非深色）
    const titleColor = await card.locator('.card-title').evaluate((el) => getComputedStyle(el).color)
    const tm = titleColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    expect(Number(tm[1])).toBeGreaterThan(150)
  })
})
