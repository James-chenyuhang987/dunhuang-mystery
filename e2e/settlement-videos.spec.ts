import { expect, test, type Page } from '@playwright/test'
import { gameLocations } from '../src/data/game'
import { chooseLocation } from './helpers'

async function completeFirstChapter(page: Page, placeId: 'dunhuang' | 'yungang'): Promise<void> {
  const location = gameLocations.find((entry) => entry.id === placeId)
  const level = location?.levels[0]
  if (!location || !level) throw new Error(`Missing ${placeId} test fixture`)

  await page.goto('/')
  await chooseLocation(page, location.name)
  await page.getByRole('button', { name: '选关', exact: true }).click()
  await page.getByRole('button', { name: /第 1 章/ }).click()
  await page.getByRole('button', { name: '开始所选关卡', exact: true }).click()
  await page.getByRole('button', { name: '开启谜题', exact: true }).click()
  const title = await page.locator('#question-title').innerText()
  const problem = level.problems.find((entry) => entry.title === title)
  if (!problem) throw new Error(`Missing question fixture for ${placeId}`)
  const answers = problem.true_answers?.length ? problem.true_answers : [problem.true_answer]
  for (const answer of answers) await page.locator('.answer-option').nth(answer).click()
  if (answers.length > 1) await page.getByRole('button', { name: '提交', exact: true }).click()
  await page.getByRole('button', { name: '查看本卷结果', exact: true }).click()
  await page.getByRole('button', { name: '关闭题目', exact: true }).click()
  await page.getByRole('button', { name: '本卷已解 · 继续探索', exact: true }).click()
  await page.getByRole('button', { name: '落款 · 查看探索回响', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/${placeId}/thank$`))
}

for (const fixture of [
  { placeId: 'dunhuang', videoName: '敦煌结算' },
  { placeId: 'yungang', videoName: '云冈结算' },
] as const) {
  test(`${fixture.videoName} plays before returning to its home page`, async ({ page }, testInfo) => {
    await completeFirstChapter(page, fixture.placeId)
    const location = gameLocations.find((entry) => entry.id === fixture.placeId)
    if (!location) throw new Error(`Missing ${fixture.placeId} location`)

    await page.getByRole('button', { name: `再赴${location.name}`, exact: true }).click()
    const transition = page.getByRole('region', { name: `${location.name}结算动画` })
    await expect(transition).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/${fixture.placeId}/thank$`))
    const source = await transition.locator('video').getAttribute('src')
    expect(decodeURIComponent(source ?? '')).toContain(`/结算动画/${fixture.videoName}.mp4`)
    await expect
      .poll(() => transition.locator('video').evaluate((video) => video.readyState))
      .toBeGreaterThanOrEqual(2)
    await transition.screenshot({ path: testInfo.outputPath(`${fixture.placeId}-settlement.png`) })

    await transition.locator('video').dispatchEvent('ended')
    await expect(page).toHaveURL(new RegExp(`/${fixture.placeId}/home$`))
  })
}
