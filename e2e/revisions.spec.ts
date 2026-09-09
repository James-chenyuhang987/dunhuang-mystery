import { expect, test } from '@playwright/test'
import { chooseDefaultLocation } from './helpers'
import { gameAuthors, gameLevels } from '../src/data/game'

for (const difficulty of [1, 2, 3]) {
  test(`selected middle chapter finishes after exactly tier ${difficulty} questions`, async ({ page }) => {
    const level = gameLevels[1]
    if (!level) throw new Error('Missing second chapter')
    const count = difficulty === 1 ? 1 : difficulty === 2 ? Math.ceil(level.problems.length / 2) : level.problems.length
    await page.goto('/')
  await chooseDefaultLocation(page)
  await page.getByRole('button', { name: '选关', exact: true }).click()
    await page.getByRole('button', { name: /九色秘语/ }).click()
    await page.getByRole('slider').fill(String(difficulty))
    await expect(page.locator('.difficulty-control output')).toHaveText(`本关需答 ${count} / 4 题`)
    await page.getByRole('button', { name: '开始所选关卡' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(level.name)
    await page.getByRole('button', { name: '开启谜题', exact: true }).click()
    const seen = new Set<string>()
    for (let index = 0; index < count; index++) {
      const title = await page.locator('#question-title').innerText()
      expect(seen.has(title)).toBe(false)
      seen.add(title)
      const problem = level.problems.find(item => item.title === title)
      if (!problem) throw new Error('Unexpected question')
      await page.locator('.answer-option').nth(problem.true_answer).click()
      await page.getByRole('button', { name: index === count - 1 ? '查看本卷结果' : '下一道谜题', exact: true }).click()
    }
    await page.getByRole('button', { name: '落款 · 查看探索回响' }).click()
    await expect(page).toHaveURL(/\/dunhuang\/thank$/)
    await expect(page.locator('.ending-stats strong').first()).toHaveText(String(count))
    for (const author of gameAuthors) {
      await expect(page.locator('.credits')).toContainText(author.name)
      await expect(page.locator('.credits')).toContainText(author.job)
    }
    await page.addInitScript(() => {
      const raw = localStorage.getItem('dunhuang-mystery:game:v1')
      if (!raw) throw new Error('Missing saved progress')
      const snapshot: Record<string, unknown> = JSON.parse(raw)
      snapshot.authors = [{ name: '旧存档团队', job: '旧职责' }]
      delete snapshot.questionFingerprint
      localStorage.setItem('dunhuang-mystery:game:v1', JSON.stringify(snapshot))
    })
    await page.reload()
    await expect(page.locator('.ending-stats strong').first()).toHaveText(String(count))
    await expect(page.locator('.credits')).not.toContainText('旧存档团队')
    for (const author of gameAuthors) {
      await expect(page.locator('.credits')).toContainText(author.name)
      await expect(page.locator('.credits')).toContainText(author.job)
    }
  })
}

test('difficulty changes inside open questions update actual remaining questions', async ({ page }) => {
  await page.goto('/')
  await chooseDefaultLocation(page)
  await page.getByRole('button', { name: '选关', exact: true }).click()
  await page.getByRole('button', { name: '开始所选关卡' }).click()
  await page.getByRole('button', { name: '开启谜题', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const firstTitle = await page.locator('#question-title').innerText()
  const problem = gameLevels[0]?.problems.find(item => item.title === firstTitle)
  if (!problem) throw new Error('Missing question')
  await page.locator('.answer-option').nth(problem.true_answer).click()
  await dialog.getByRole('button', { name: '解谜 3 题' }).click()
  await expect(dialog.locator('output')).toHaveText('本关需答 3 / 3 题')
  await expect(page.locator('.question-progress')).toHaveText('解谜进度 1 / 3')
  await expect(page.locator('#question-title')).not.toHaveText(firstTitle)
  await dialog.getByRole('button', { name: '初探 1 题' }).click()
  await expect(page.locator('#question-title')).toHaveText('此卷疑云，已然散尽。')
})

test('fullscreen image supports zoom, pinch, reset and close without moving panorama', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await chooseDefaultLocation(page)
  await page.getByRole('button', { name: '选关', exact: true }).click()
  await page.getByRole('button', { name: '开始所选关卡' }).click()
  const imageIndex = gameLevels[0]?.clues.findIndex(item => item.type === 'image') ?? -1
  await page.locator('.clue-drawer-heading').click()
  await page.locator('.clue-toggle').nth(imageIndex).click()
  await page.getByRole('button', { name: '全屏查看与缩放' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('img')).toBeVisible()
  const before = await page.locator('.panorama').getAttribute('data-fov')
  await page.getByRole('button', { name: '放大线索', exact: true }).click()
  await expect(dialog.locator('output')).toHaveText('125%')
  await dialog.locator('.media-stage').dispatchEvent('wheel', { deltaY: -200 })
  await expect(dialog.locator('output')).not.toHaveText('125%')
  await page.getByRole('button', { name: '重置视图' }).click()
  await expect(dialog.locator('output')).toHaveText('100%')
  const stage = dialog.locator('.media-stage')
  await stage.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 100, clientY: 300 })
  await stage.dispatchEvent('pointerdown', { pointerId: 8, pointerType: 'touch', clientX: 200, clientY: 300 })
  await stage.dispatchEvent('pointermove', { pointerId: 8, pointerType: 'touch', clientX: 300, clientY: 300 })
  await expect(dialog.locator('output')).toHaveText('200%')
  await stage.dispatchEvent('pointerup', { pointerId: 7 })
  await stage.dispatchEvent('pointerup', { pointerId: 8 })
  await stage.dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch', clientX: 100, clientY: 300 })
  await stage.dispatchEvent('pointermove', { pointerId: 9, pointerType: 'touch', clientX: 140, clientY: 330 })
  await expect(dialog.locator('img')).toHaveCSS('transform', 'matrix(2, 0, 0, 2, 40, 30)')
  await stage.dispatchEvent('pointerup', { pointerId: 9 })
  await dialog.locator('img').dispatchEvent('error')
  await expect(dialog.getByRole('alert')).toContainText('素材加载失败')
  await dialog.getByRole('button', { name: '重新加载大图 / 视频' }).click()
  await expect(dialog.locator('img')).toBeVisible()
  await expect(dialog.getByRole('alert')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.panorama')).toHaveAttribute('data-fov', before ?? '')
})
