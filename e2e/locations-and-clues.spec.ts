import { test, expect } from '@playwright/test'
import path from 'node:path'
import { gameLocations } from '../src/data/game'

const terracotta = gameLocations.find(location => location.id === 'terracotta')
if (!terracotta) throw new Error('Terracotta fixture is missing')

test('location globe enters a complete three-chapter terracotta destination', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.location-selector')).toBeVisible()
  await expect(page.locator('.location-option')).toHaveCount(2)
  await page.locator('.location-option').filter({ hasText: '秦始皇帝陵博物院' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('兵马俑秘境探索')
  await page.getByRole('button', { name: '选关', exact: true }).click()
  await expect(page.locator('.chapter-card')).toHaveCount(3)
  await expect(page.locator('.chapter-card').first()).toContainText(terracotta.levels[0]!.name)
})

test('panorama hotspots reveal clues and visual matching stays local', async ({ page }) => {
  await page.goto('/')
  await page.locator('.location-option').filter({ hasText: '秦始皇帝陵博物院' }).click()
  await page.getByRole('button', { name: '选关', exact: true }).click()
  await page.getByRole('button', { name: /第 1 章/ }).click()
  await page.getByRole('button', { name: '开始所选关卡' }).click()
  await expect(page.locator('.panorama-hotspot')).toHaveCount(3)
  await page.locator('.panorama-hotspot').first().click()
  await expect(page.locator('.clue-panel').first().locator('.clue-body')).toBeVisible()
  const fileChooser = page.locator('.image-comparison input[type=file]')
  await fileChooser.setInputFiles(path.resolve('public/art/terracotta-clue.svg'))
  await expect(page.locator('.comparison-result')).toContainText('100%')
  await expect(page.locator('.comparison-result')).toContainText('任务完成')
})

test('a wrong answer is recorded once, offers mapped clues and moves on without retry', async ({ page }) => {
  await page.goto('/')
  await page.locator('.location-option').filter({ hasText: '敦煌莫高窟' }).click()
  await page.getByRole('button', { name: '选关', exact: true }).click()
  await page.getByRole('button', { name: /第 1 章/ }).click()
  await page.getByRole('button', { name: '开始所选关卡' }).click()
  await page.getByRole('button', { name: '开启谜题' }).click()
  const title = await page.locator('#question-title').innerText()
  const question = gameLocations[0]!.levels[0]!.problems.find(entry => entry.title === title)
  if (!question) throw new Error(`Question not found: ${title}`)
  await page.locator('.answer-option').nth((question.true_answer + 1) % 4).click()
  await expect(page.locator('.answer-feedback')).toContainText('本题已经记录为错误')
  await expect(page.locator('.answer-option.correct')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /线索 \d/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: '再次推断' })).toHaveCount(0)
  await page.getByRole('button', { name: /查看本卷结果|下一道谜题/ }).click()
  await expect(page.locator('.answer-feedback')).toHaveCount(0)
})
