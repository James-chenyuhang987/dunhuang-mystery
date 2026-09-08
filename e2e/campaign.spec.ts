import { test, expect } from '@playwright/test'
import { gameLevels, siteConfig } from '../src/data/game'

test('main menu starts a linear campaign, survives reload and ends only after last chapter', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(siteConfig.title)
  await expect(page.getByRole('button')).toHaveCount(2)
  await expect(page.locator('.chapter-card')).toHaveCount(0)
  await page.getByRole('button', { name: '选关', exact: true }).click()
  await page.locator('.chapter-card').last().click()
  await page.getByRole('link', { name: '返回主菜单' }).click()
  await page.getByRole('button', { name: '开始', exact: true }).click()
  for (const [index, level] of gameLevels.entries()) {
    await expect(page).toHaveURL(/\/game$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(level.name)
    if (index > 0) {
      await page.reload()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(level.name)
    }
    await page.getByRole('button', { name: level.problems.length ? '开启谜题' : '完成本关', exact: true }).click()
    if (level.problems.length) {
      const title = await page.locator('#question-title').innerText()
      const question = level.problems.find(question => question.title === title)
      if (!question) throw new Error(`Missing question fixture: ${title}`)
      await page.locator('.answer-option').nth(question.true_answer).click()
      await page.getByRole('button', { name: '查看本卷结果', exact: true }).click()
    }
    await page.getByRole('button', { name: index < gameLevels.length - 1 ? '完成本关 · 前往下一关' : '落款 · 查看探索回响', exact: true }).click()
  }
  await expect(page).toHaveURL(/\/ending$/)
  await expect(page.locator('.ending-stats strong').first()).toHaveText(String(gameLevels.filter(level => level.problems.length).length))
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(siteConfig.endingHeading)
})
