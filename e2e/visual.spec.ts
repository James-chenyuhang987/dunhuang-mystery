import { test, expect } from '@playwright/test'
import { chooseDefaultLocation, chooseLocation } from './helpers'
import { gameLevels } from '../src/data/game'

test('desktop and mobile visual checks', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await chooseDefaultLocation(page)
  await expect(page.getByRole('button', { name: '开始', exact: true })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true })
  await expect(page.locator('.journey-panel > .start-button')).toHaveCount(2)
  await page.getByRole('button', { name: '选关', exact: true }).click()
  await expect(page).toHaveURL(/\/dunhuang\/home\?panel=levels$/)
  await expect(page.locator('.chapter-card')).toHaveCount(3)
  await page.screenshot({ path: testInfo.outputPath('selection-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('selection-mobile.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('link', { name: '返回主菜单' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('home-mobile.png'), fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: '开始', exact: true }).click()
  await expect(page.locator('.panorama-status')).toHaveCount(0)
  await expect(page.locator('.archive-controls')).toBeVisible()
  await expect(page.getByRole('button', { name: '时间与观察', exact: true })).not.toBeVisible()
  await expect(page.locator('.mobile-clue-toggle')).not.toBeVisible()
  await expect(page.locator('.clue-drawer-desktop-toggle')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('game-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: '开启紫外线' }).click()
  await expect(page.locator('.panorama')).toHaveAttribute('data-ultraviolet-pass', 'active')
  await page.screenshot({
    path: testInfo.outputPath('game-desktop-ultraviolet.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: '退出紫外线' }).click()
  await expect(page.locator('.panorama')).toHaveAttribute('data-ultraviolet-pass', 'inactive')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.archive-controls')).not.toBeVisible()
  const mobileClueToggle = page.getByRole('button', { name: '探秘手礼', exact: true })
  await expect(mobileClueToggle).toBeVisible()
  await expect(page.locator('.clue-drawer-desktop-toggle')).not.toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  const toolbarChildren = await page
    .locator('.game-toolbar > *')
    .evaluateAll((elements) => elements.map((element) => element.className))
  expect(toolbarChildren.indexOf('archive-toggle outline-button')).toBeLessThan(
    toolbarChildren.indexOf('mobile-clue-toggle outline-button'),
  )
  expect(toolbarChildren.indexOf('mobile-clue-toggle outline-button')).toBeLessThan(
    toolbarChildren.indexOf('game-stats'),
  )
  await mobileClueToggle.click()
  await expect(page.locator('.clue-drawer')).toBeVisible()
  await mobileClueToggle.click()
  await expect(page.locator('.clue-drawer')).not.toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('game-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: '时间与观察', exact: true }).click()
  await expect(page.locator('.archive-controls')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('game-mobile-archive.png'), fullPage: true })
  await page.getByRole('button', { name: '时间与观察', exact: true }).click()
  await page.getByRole('button', { name: '开启谜题', exact: true }).click()
  await expect(page.locator('.answer-option')).toHaveCount(4)
  await page.screenshot({ path: testInfo.outputPath('question-mobile.png'), fullPage: true })
  expect(errors).toEqual([])
})

test('Yungang ultraviolet filter keeps the stone details in a dark indigo range', async (
  { page },
  testInfo,
) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await chooseLocation(page, '云冈石窟')
  await page.getByRole('button', { name: '开始', exact: true }).click()
  await expect(page.locator('.panorama-status')).toHaveCount(0)
  await page.getByRole('button', { name: '开启紫外线' }).click()
  await expect(page.locator('.panorama')).toHaveAttribute('data-ultraviolet-pass', 'active')
  await page.screenshot({
    path: testInfo.outputPath('yungang-ultraviolet.png'),
    fullPage: true,
  })
})

test('postcard pixel styles remain legible on desktop and mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await chooseDefaultLocation(page)
  await page.getByRole('button', { name: '选关', exact: true }).click()
  await page.getByRole('button', { name: '开始所选关卡', exact: true }).click()
  await page.getByRole('button', { name: '开启谜题', exact: true }).click()
  const title = await page.locator('#question-title').innerText()
  const problem = gameLevels[0]?.problems.find((entry) => entry.title === title)
  if (!problem) throw new Error(`Missing postcard visual fixture: ${title}`)
  await page.locator('.answer-option').nth(problem.true_answer).click()
  await page.getByRole('button', { name: '查看本卷结果', exact: true }).click()
  await page.getByRole('button', { name: '关闭题目', exact: true }).click()
  await page.getByRole('button', { name: '本卷已解 · 继续探索', exact: true }).click()
  await page.getByRole('button', { name: '落款 · 查看探索回响', exact: true }).click()

  const postcard = page.locator('.postcard-generator')
  const canvas = postcard.locator('canvas')
  await expect(postcard).toBeVisible()
  for (const [label, filename] of [
    ['原图', 'postcard-original.png'],
    ['动漫风', 'postcard-anime.png'],
    ['线描风', 'postcard-line-art.png'],
    ['水墨风', 'postcard-ink-wash.png'],
  ] as const) {
    const previous = await canvas.evaluate((element) => element.toDataURL())
    await postcard.getByRole('button', { name: label, exact: true }).click()
    await expect(postcard.getByRole('button', { name: label, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect.poll(() => canvas.evaluate((element) => element.toDataURL())).not.toBe(previous)
    await postcard.screenshot({ path: testInfo.outputPath(filename) })
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await postcard.screenshot({ path: testInfo.outputPath('postcard-mobile.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
