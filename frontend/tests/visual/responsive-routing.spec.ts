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

    const inspector = page.locator('.mc-flow-inspector')
    await expect(inspector.getByText('Unidad de carguío', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Datos actualizados', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Escenario sintético', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Hecho de fuente', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Alimenta', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Carga', { exact: true })).toBeVisible()

    const operationalText = await page.locator('main').innerText()
    expect(operationalText).not.toMatch(/\b(?:LOADING_UNIT|FEEDS|LOADS|FACT|FRESH|SYNTHETIC|CONFIRMED|S01)\b/)
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
