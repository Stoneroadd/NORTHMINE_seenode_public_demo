import { expect, test } from '@playwright/test'
import { appPaths } from '../../src/lib/appRoutes'
import { loginAsDemo, navigateWithinApp } from './helpers/responsive'

test.describe('canonical authenticated routing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
  })

  test('Mission Control and analysis routes survive history navigation', async ({ page }) => {
    await navigateWithinApp(page, `${appPaths.operationalFlow}/`)
    await expect(page.getByText('Operational Flow', { exact: true }).first()).toBeVisible()

    if ((page.viewportSize()?.width ?? 1200) < 860) {
      await page.locator('.topbar-menu-button').click()
    }
    await page.locator(`a[href="${appPaths.prediccion}"]`).click()
    await page.waitForURL((url) => url.pathname === appPaths.prediccion)
    await expect(page.locator('canvas:not(.matrix-rain):not([aria-hidden="true"])').first()).toBeVisible({ timeout: 15_000 })

    await page.goBack()
    await page.waitForURL((url) => url.pathname === `${appPaths.operationalFlow}/`)
    await expect(page.getByText('Operational Flow', { exact: true }).first()).toBeVisible()

    await page.goForward()
    await page.waitForURL((url) => url.pathname === appPaths.prediccion)
    await expect(page.locator('.topbar')).toBeVisible()
    await expect(page.getByPlaceholder('usuario')).toHaveCount(0)
  })
})
