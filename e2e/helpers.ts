import type { Page } from '@playwright/test'

export async function chooseDefaultLocation(page: Page): Promise<void> {
  const selector = page.locator('.location-selector')
  if (await selector.isVisible()) await selector.locator('.location-option').first().click()
}
