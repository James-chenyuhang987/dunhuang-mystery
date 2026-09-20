import type { Page } from '@playwright/test'

async function reachLocationSelector(page: Page): Promise<boolean> {
  const intro = page.locator('.intro-screen')
  if (!(await intro.isVisible())) return false
  const earthSkip = page.getByRole('button', { name: /跳过地球动画/ })
  if (await earthSkip.isVisible().catch(() => false)) await earthSkip.click()
  const videoSkip = page.getByRole('button', { name: /跳过视频/ })
  if (await videoSkip.isVisible().catch(() => false)) await videoSkip.click()
  return true
}

async function finishLocationSelection(page: Page): Promise<void> {
  const intro = page.locator('.intro-screen')
  const destinationSkip = page.getByRole('button', { name: /跳过视频/ })
  if (await destinationSkip.isVisible().catch(() => false)) await destinationSkip.click()
  await intro.waitFor({ state: 'hidden' })
}

export async function chooseDefaultLocation(page: Page): Promise<void> {
  if (!(await reachLocationSelector(page))) return
  const location = page.locator('.location-option').first()
  await location.waitFor({ state: 'visible' })
  await location.click()
  await finishLocationSelection(page)
}

export async function chooseLocation(page: Page, name: string): Promise<void> {
  if (!(await reachLocationSelector(page))) return
  const location = page.locator('.location-option').filter({ hasText: name })
  await location.waitFor({ state: 'visible' })
  await location.click()
  await finishLocationSelection(page)
}
