import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsDemo, navigateWithinApp } from './helpers/responsive'

const ECHARTS_ROUTES = [
  { path: '/rendimiento', label: 'Rendimiento' },
  { path: '/alertas', label: 'Alertas' },
  { path: '/prediccion', label: 'Prediccion' },
]

test.describe('ECharts operational surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
  })

  for (const { path, label } of ECHARTS_ROUTES) {
    test(`${label} (${path}) mounts and survives pointer interaction`, async ({ page }) => {
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))

      await navigateWithinApp(page, path)
      await expectNoHorizontalOverflow(page)

      const canvases = page.locator('canvas:not(.matrix-rain):not([aria-hidden="true"])')
      await expect(canvases.first(), `${label} should expose an ECharts canvas`).toBeVisible({ timeout: 15_000 })
      await expect
        .poll(
          () => canvases.first().evaluate((canvas) => {
            const box = canvas.getBoundingClientRect()
            return box.width > 0 && box.height > 0
          }),
          { message: `${label} chart should settle to a non-zero drawing surface`, timeout: 8_000 },
        )
        .toBe(true)

      await canvases.first().hover()
      await page.waitForTimeout(150)
      expect(pageErrors, `${label} should not raise a browser error during chart hover`).toEqual([])
    })
  }

  test('analysis navigation preserves the authenticated application session', async ({ page }) => {
    if ((page.viewportSize()?.width ?? 1200) < 860) {
      await page.locator('.topbar-menu-button').click()
    }

    await page.locator('a[href="/prediccion"]').click()
    await page.waitForURL((url) => url.pathname === '/prediccion')

    await expect(page.locator('.topbar')).toBeVisible()
    await expect(page.locator('input[placeholder="usuario"]')).toHaveCount(0)
    await expect(page.locator('canvas:not(.matrix-rain):not([aria-hidden="true"])').first()).toBeVisible({ timeout: 15_000 })
  })
})
