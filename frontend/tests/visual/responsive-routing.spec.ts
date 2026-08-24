import { expect, test } from '@playwright/test'
import { appPaths } from '../../src/lib/appRoutes'
import { loginAsDemo, navigateWithinApp } from './helpers/responsive'

test.describe('canonical authenticated routing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
  })

  test('Operational Flow is discoverable from operational navigation', async ({ page }) => {
    if ((page.viewportSize()?.width ?? 1200) < 860) {
      await page.locator('.topbar-menu-button').click()
    }

    const entry = page.locator('button[title^="Operational Flow:"]')
    await expect(entry).toBeVisible()
    await entry.click()

    await page.waitForURL((url) => url.pathname === appPaths.operationalFlow)
    await expect(page.locator('.mc-flow-context h1')).toHaveText('Operational Flow')
    await expect(entry).toHaveClass(/is-active/)
    await expect(page.getByPlaceholder('usuario')).toHaveCount(0)
  })

  test('Mission Control and analysis routes survive history navigation', async ({ page }) => {
    await navigateWithinApp(page, `${appPaths.operationalFlow}/`)
    await expect(page.locator('.mc-flow-context h1')).toHaveText('Operational Flow')

    if ((page.viewportSize()?.width ?? 1200) < 860) {
      await page.locator('.topbar-menu-button').click()
    }
    await page.locator(`a[href="${appPaths.prediccion}"]`).click()
    await page.waitForURL((url) => url.pathname === appPaths.prediccion)
    await expect(page.locator('canvas:not(.matrix-rain):not([aria-hidden="true"])').first()).toBeVisible({ timeout: 15_000 })

    await page.goBack()
    await page.waitForURL((url) => url.pathname === `${appPaths.operationalFlow}/`)
    await expect(page.locator('.mc-flow-context h1')).toHaveText('Operational Flow')

    await page.goForward()
    await page.waitForURL((url) => url.pathname === appPaths.prediccion)
    await expect(page.locator('.topbar')).toBeVisible()
    await expect(page.getByPlaceholder('usuario')).toHaveCount(0)
  })
})
