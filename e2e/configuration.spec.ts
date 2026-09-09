import { test, expect } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'
import { mediaConfig, siteConfig } from '../src/data/game'
import type { level } from '../src/types/game'

let server: ViteDevServer
let fixtureUrl: string
// Serve source modules for configuration substitution even when CI tests the production build.
test.beforeAll(async () => {
  server = await createServer({ server: { host: '127.0.0.1', port: 0 } })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('Configuration fixture server unavailable')
  fixtureUrl = `http://127.0.0.1:${address.port}`
})
test.afterAll(async () => { await server?.close() })

const levels: level[] = Array.from({ length: 5 }, (_, index) => ({
  name: index === 0 || index === 1 ? '相同名称' : `测试配置第 ${index + 1} 关`,
  panorama_url: '/art/cave-01.svg',
  subtitle: `配置副标题 ${index + 1}`,
  description: `配置介绍 ${index + 1}`,
  clues: [],
  problems: index === 4 ? [{ title: '来自配置的自定义问题', select: ['选项一', '选项二', '选项三', '选项四'], true_answer: 3, reason: '配置解析' }] : [],
}))

for (const empty of [false, true]) {
  test(`custom configuration renders and plays without sample assumptions (empty=${empty})`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/src/data/game.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export const gameLevels = ${JSON.stringify(empty ? [] : levels)}; export const gameLocations = [{ id: 'custom', name: '自定义地点', title: '自定义探索标题', subtitle: '测试', coordinates: '0°', background_url: '/art/landscape.svg', levels: gameLevels }]; export const gameAuthors = []; export const mediaConfig = ${JSON.stringify(mediaConfig)}; export const siteConfig = ${JSON.stringify({ ...siteConfig, title: '自定义探索标题', backgroundUrl: '/art/landscape.svg' })};` }))
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(fixtureUrl)
    await page.locator('.location-option').click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('自定义探索标题')
    await expect(page).toHaveTitle(/自定义探索标题/)
    await expect(page.getByRole('button')).toHaveCount(2)
    if (empty) {
      await expect(page.getByRole('button', { name: '开始', exact: true })).toBeDisabled()
      await expect(page.getByRole('status')).toContainText('暂无关卡')
      await page.getByRole('button', { name: '选关', exact: true }).click()
      await expect(page.getByRole('button', { name: '开始所选关卡' })).toBeDisabled()
    } else {
      await page.getByRole('button', { name: '选关', exact: true }).click()
      await expect(page.locator('.chapter-card')).toHaveCount(5)
      await expect(page.locator('.chapter-card').last()).toContainText('第 5 章')
      await expect(page.locator('.chapter-preview img').last()).toHaveAttribute('src', levels[4]!.panorama_url)
      await page.locator('.chapter-card').last().click()
      await expect(page.locator('.chapter-description')).toHaveText('配置介绍 5')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.getByRole('link', { name: '返回主菜单' }).click()
      await page.getByRole('button', { name: '开始', exact: true }).click()
      for (const [index, level] of levels.entries()) {
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(level.name)
        await page.reload()
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(level.name)
        await page.getByRole('button', { name: level.problems.length ? '开启谜题' : '完成本关', exact: true }).click()
        if (level.problems.length) {
          await expect(page.locator('#question-title')).toHaveText(level.problems[0]!.title)
          await page.locator('.answer-option').nth(3).click()
          await page.getByRole('button', { name: '查看本卷结果' }).click()
        }
        await page.getByRole('button', { name: index < levels.length - 1 ? '完成本关 · 前往下一关' : '落款 · 查看探索回响' }).click()
      }
      await expect(page).toHaveURL(/\/ending$/)
      await expect(page.locator('.ending-stats strong').first()).toHaveText('1')
      await expect(page.locator('.credits > div')).toHaveCount(0)
    }
    expect(errors).toEqual([])
  })
}
