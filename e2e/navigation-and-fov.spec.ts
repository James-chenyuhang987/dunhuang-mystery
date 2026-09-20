import { expect, test } from '@playwright/test'

test('studio and user-story return actions lead to the location selector', async ({ page }) => {
  await page.goto('/#/studio')
  await page.getByRole('button', { name: '返回画境', exact: true }).click()
  await expect(page).toHaveURL(/\/select$/)

  await page.goto('/#/studio')
  await page.getByRole('button', { name: '开始试玩', exact: true }).click()
  await expect(page).toHaveURL(/\/story\/[^/]+\/home$/)
  const storyHomeUrl = page.url()

  await page.getByRole('link', { name: '返回画境', exact: true }).click()
  await expect(page).toHaveURL(/\/select$/)

  await page.goto(storyHomeUrl)
  await page.getByRole('button', { name: '开始故事', exact: true }).click()
  await expect(page.locator('.panorama')).toHaveAttribute('data-fov', '55')
})

test('Yungang panoramas use the shared natural-view FOV', async ({ page }) => {
  await page.goto('/#/select')
  await page.getByRole('button', { name: /云冈石窟/ }).click()
  await expect(page).toHaveURL(/\/yungang\/home$/)
  await page.getByRole('button', { name: '开始', exact: true }).click()
  await expect(page.locator('.panorama')).toHaveAttribute('data-fov', '55')
})
