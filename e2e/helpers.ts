import type { Page } from '@playwright/test'

export async function chooseDefaultLocation(page: Page): Promise<void> {
  const intro = page.locator('.intro-screen')
  if (!(await intro.isVisible())) return
  const earthSkip = page.getByRole('button', { name: /跳过地球动画/ })
  if (await earthSkip.isVisible().catch(() => false)) await earthSkip.click()
  const videoSkip = page.getByRole('button', { name: /跳过视频/ })
  if (await videoSkip.isVisible().catch(() => false)) await videoSkip.click()
  const location = page.locator('.location-option').first()
  await location.waitFor({ state: 'visible' })
  await location.click()
  const destinationSkip = page.getByRole('button', { name: /跳过视频/ })
  if (await destinationSkip.isVisible().catch(() => false)) await destinationSkip.click()
  await intro.waitFor({ state: 'hidden' })
}
