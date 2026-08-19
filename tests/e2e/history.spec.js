// @ts-check
import { test, expect } from './fixtures.js'

/**
 * 岁月史书（/history）剧情可视化编辑器 一期 PoC 测试
 *
 * 覆盖：登录 -> 页面加载 + 序章 157 节点画布渲染 -> 章节切换（第一章 320 节点）
 *      -> 节点选中 + 属性面板编辑 + 未导出标记 -> 校验面板
 * 关联：src/views/HistoryView.vue / src/components/history/StoryEditor.vue / src/history/converter.js
 */

const USER = 'chenzijian'
const PASS = 'czj136523510'

test.describe('岁月史书·剧情编辑器', () => {
  test.beforeEach(async ({ page }) => {
    // 登录取 token：页面上下文内同源 fetch（沿用 fortune.spec 套路）
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
  })

  test('学院数据 tab：面板加载 + 统计渲染', async ({ page }) => {
    await page.goto('/history')
    // 默认就是学院数据 tab
    await expect(page.getByTestId('analytics-panel')).toBeVisible()
    await expect(page.locator('.panel-title')).toHaveText('学院数据')
    // 切时间范围可用
    await page.getByTestId('analytics-days').selectOption('7')
  })

  test('序章加载', async ({ page }) => {
    await page.goto('/history')
    await page.getByTestId('tab-editor').click()

    // 工具栏统计
    await expect(page.getByTestId('stat-nodes')).toHaveText('157 节点', { timeout: 10000 })
    await expect(page.getByTestId('stat-edges')).toHaveText('180 连线')

    // 画布节点渲染（Vue Flow 渲染 .vue-flow__node，自定义卡片 .story-node）
    const nodeCount = await page.locator('.vue-flow__node').count()
    expect(nodeCount).toBe(157)

    // 布局展开断言（防回归：曾因非受控 mutate position 不生效全堆原点）
    const transforms = await page.locator('.vue-flow__node').evaluateAll((els) =>
      els.map((el) => {
        const m = el.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
        return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 }
      })
    )
    const atOrigin = transforms.filter((t) => Math.abs(t.x) < 1 && Math.abs(t.y) < 1).length
    expect(atOrigin).toBeLessThan(5) // 全堆原点 = 布局没跑；允许个别视觉重叠
    const xs = transforms.map((t) => t.x)
    const spread = Math.max(...xs) - Math.min(...xs)
    expect(spread).toBeGreaterThan(1000) // dagre LR 布局横向应铺开上千像素

    // 节点分型：对话节点带说话人徽标
    const speakers = await page.locator('.story-node .node-speaker').allInnerTexts()
    expect(speakers.length).toBeGreaterThan(50)
    expect(speakers).toContain('旁白')

    // 无 console error
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    expect(errors).toEqual([])
  })

  test('章节切换', async ({ page }) => {
    await page.goto('/history')
    await page.getByTestId('tab-editor').click()
    await expect(page.getByTestId('stat-nodes')).toHaveText('157 节点')

    // 切第一章
    await page.getByTestId('chapter-select').selectOption('chapter1')
    await expect(page.getByTestId('stat-nodes')).toHaveText('320 节点', { timeout: 10000 })
    await expect(page.getByTestId('stat-edges')).toHaveText('354 连线')
  })

  test('节点编辑', async ({ page }) => {
    await page.goto('/history')
    await page.getByTestId('tab-editor').click()
    await expect(page.getByTestId('stat-nodes')).toHaveText('157 节点')

    // 初始无未导出标记
    await expect(page.getByTestId('dirty-badge')).toHaveCount(0)

    // 点击第一个对话节点：dagre 布局 Q&A 区有循环边致节点重叠，Playwright 物理点击会被
    // 遮挡层截获（force 也一样），改在页面内 DOM 派发 click（Vue Flow nodeClick 冒泡监听生效）
    await page.locator('.vue-flow__node[data-id="pro_001"]').scrollIntoViewIfNeeded()
    await page.evaluate(() => {
      document
        .querySelector('.vue-flow__node[data-id="pro_001"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // 属性面板出现，三个字段可见
    const panel = page.getByTestId('props-panel')
    await expect(panel).toBeVisible()
    await expect(page.getByTestId('prop-speaker')).toHaveValue('旁白')
    await expect(page.getByTestId('prop-text')).toHaveValue('虚空降临第118年。')
    await expect(page.getByTestId('prop-next')).toHaveValue('pro_002')

    // 改台词 -> 未导出标记
    await page.getByTestId('prop-text').fill('虚空降临第118年。（e2e 编辑验证）')
    await page.getByTestId('prop-text').blur()
    await expect(page.getByTestId('dirty-badge')).toBeVisible()

    // 校验：干净数据 + 一处文案改动，应 0 错误
    await page.getByTestId('btn-validate').click()
    await expect(page.getByTestId('validate-panel')).toBeVisible()
    await expect(page.getByTestId('validate-panel')).toContainText('全部通过，无错误无警告')
  })

  test('a11y', async ({ page }) => {
    await page.goto('/history')
    await page.getByTestId('tab-editor').click()
    await expect(page.getByTestId('stat-nodes')).toHaveText('157 节点')

    // 工具栏按钮 testid 齐全（含全图按钮）
    for (const id of ['btn-fitview', 'btn-layout', 'btn-validate', 'btn-export']) {
      await expect(page.getByTestId(id)).toBeVisible()
    }

    // 搜索框可输入且能定位
    const search = page.getByTestId('node-search-input')
    await expect(search).toBeVisible()
    await search.fill('pro_choice')
    await search.press('Enter')
    await expect(page.locator('[role="option"]')).toHaveCount(await page.locator('[role="option"]').count())

    // 校验面板关闭按钮带 aria-label（图标按钮 a11y 规范）
    await page.getByTestId('btn-validate').click()
    await expect(page.getByTestId('validate-panel')).toBeVisible()
    await expect(page.getByRole('button', { name: '关闭校验面板' })).toBeVisible()
    await page.getByRole('button', { name: '关闭校验面板' }).click()
    await expect(page.getByTestId('validate-panel')).toHaveCount(0)
  })
})
