import type { Page } from '@playwright/test'

export async function chooseDefaultLocation(page: Page): Promise<void> {
  const intro = page.locator('.intro-screen')
  if (await intro.isVisible()) {
    const skip = page.getByRole('button', { name: /跳过开场/ })
    await skip.waitFor({ state: 'visible' })
    await skip.click()
    await intro.waitFor({ state: 'hidden' })
  }
}
