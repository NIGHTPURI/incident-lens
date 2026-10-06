import { expect, type Page } from '@playwright/test';

/** Follow the same visible navigation on desktop and the mobile drawer. */
export async function navigate(page: Page, name: string) {
  const toggle = page.locator('.menu-toggle');
  if (await toggle.isVisible() && !(await page.locator('.tool-sidebar').isVisible())) {
    await toggle.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  }
  await page.locator('.tool-sidebar').getByRole('button', { name, exact: true }).click();
  await expect(page.locator('.tool-current-location strong')).toHaveText(name);
}

export async function sessionsViaLogo(page: Page) {
  if (await page.locator('.tool-mobile-brand').isVisible()) {
    await page.locator('.tool-mobile-brand').click();
  } else {
    await page.locator('.tool-sidebar .brand').click();
  }
  await expect(page.locator('.sessions-view')).toBeVisible();
}
