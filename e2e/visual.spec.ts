import { test, expect } from '@playwright/test'

test('desktop and mobile visual checks', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: '启程 · 探索壁画' })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: '探索手札' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('home-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: '启程 · 探索壁画' }).click()
  await expect(page.locator('.panorama-status')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('game-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: '开启谜题', exact: true }).click()
  await expect(page.locator('.answer-option')).toHaveCount(4)
  await page.screenshot({ path: testInfo.outputPath('question-mobile.png'), fullPage: true })
  expect(errors).toEqual([])
})
