import { test, expect } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsDemo } from './helpers/responsive'

async function openSettings(page: import('@playwright/test').Page) {
  await loginAsDemo(page)
  await page.locator('button[title^="Configuración"]').click()

  const settings = page.getByRole('dialog', { name: /configuraci/i })
  await expect(settings).toBeVisible()
  return settings
}

test.describe('MFA setup dialog', () => {
  test('starts one setup request for each explicit opening', async ({ page }) => {
    const setupRequests: string[] = []
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/mfa/setup') {
        setupRequests.push(request.url())
      }
    })
    const settings = await openSettings(page)
    const opener = settings.getByRole('button', { name: /configurar mfa/i })

    await opener.click()
    await expect.poll(() => setupRequests.length, { timeout: 15_000 }).toBe(1)
    await page.waitForTimeout(500)
    expect(setupRequests).toHaveLength(1)
  })

  test('contains focus, closes only the nested dialog and restores its opener', async ({ page }) => {
    const settings = await openSettings(page)
    const opener = settings.getByRole('button', { name: /configurar mfa/i })

    await expect(opener).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(opener).toHaveAttribute('aria-controls', 'northmine-mfa-setup')
    await expect(opener).toHaveAttribute('aria-expanded', 'false')
    await opener.click()

    const dialog = page.locator('#northmine-mfa-setup')
    await expect(dialog).toHaveRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(opener).toHaveAttribute('aria-expanded', 'true')
    await expectNoHorizontalOverflow(page)
    await expect.poll(() => dialog.evaluate(panel => panel.contains(document.activeElement))).toBe(true)

    await page.keyboard.press('Tab')
    await expect.poll(() => dialog.evaluate(panel => panel.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')

    await expect(dialog).toHaveCount(0)
    await expect(settings).toBeVisible()
    await expect(opener).toBeFocused()
    await expect(opener).toHaveAttribute('aria-expanded', 'false')
  })
})
