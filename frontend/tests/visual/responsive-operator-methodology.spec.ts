import { test, expect } from '@playwright/test'
import { expectNoHorizontalOverflow, gotoAndSettle } from './helpers/responsive'

test.describe('operator methodology dialog', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndSettle(page, '/acceso-demo', 500)
    await page.fill('input[placeholder="usuario"]', 'demo')
    await page.fill('input[placeholder="contrasena"]', 'demo')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/cockpit', { timeout: 20_000 })
    await page.evaluate(() => {
      window.history.pushState({}, '', '/operator-ranking')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await page.getByRole('button', { name: /^ver metodolog/i }).waitFor({ state: 'visible', timeout: 30_000 })
  })

  test('contains keyboard focus, closes on Escape and restores the opener', async ({ page }) => {
    const trigger = page.getByRole('button', { name: /^ver metodolog/i })
    await trigger.click()

    const dialog = page.getByRole('dialog', { name: /score/i })
    const closeButton = dialog.getByRole('button', { name: /cerrar metodolog/i })

    await expect(dialog).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(closeButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(closeButton).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(closeButton).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
  })

  test('keeps the mobile surface inside the viewport', async ({ page }) => {
    await page.getByRole('button', { name: /^ver metodolog/i }).click()
    const dialog = page.getByRole('dialog', { name: /score/i })
    await expect(dialog).toBeVisible()
    await expectNoHorizontalOverflow(page)

    const closeBox = await dialog.getByRole('button', { name: /cerrar metodolog/i }).boundingBox()
    expect(closeBox).not.toBeNull()
    expect(closeBox!.width).toBeGreaterThanOrEqual(44)
    expect(closeBox!.height).toBeGreaterThanOrEqual(44)
  })
})
