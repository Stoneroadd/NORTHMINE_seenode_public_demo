import { test, expect } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsDemo, navigateWithinApp } from './helpers/responsive'

async function openPerformance(page: import('@playwright/test').Page) {
  await loginAsDemo(page)
  await navigateWithinApp(page, '/rendimiento')

  const trigger = page.locator('.loader-phase-legend button').first()
  await trigger.waitFor({ state: 'visible', timeout: 30_000 })
  return trigger
}

test.describe('shared equipment detail drawer', () => {
  test('contains focus, closes on Escape and restores its opener', async ({ page }) => {
    const trigger = await openPerformance(page)

    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(trigger).toHaveAttribute('aria-controls', 'equipment-detail-drawer')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.click()

    const dialog = page.locator('#equipment-detail-drawer')
    const closeButton = dialog.getByRole('button', { name: /cerrar/i }).first()
    await expect(dialog).toHaveRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(closeButton).toBeVisible({ timeout: 30_000 })
    await expect(closeButton).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const lastButton = dialog.locator('button:not([disabled])').last()
    await lastButton.focus()
    await page.keyboard.press('Tab')
    await expect(closeButton).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(lastButton).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
  })

  test('stays inside a narrow viewport with a touch-safe close action', async ({ page }) => {
    const trigger = await openPerformance(page)
    await trigger.click()

    const dialog = page.locator('#equipment-detail-drawer')
    const closeButton = dialog.getByRole('button', { name: /cerrar/i }).first()
    await expect(dialog).toBeVisible()
    await expect(closeButton).toBeVisible({ timeout: 30_000 })
    await expectNoHorizontalOverflow(page)

    const viewport = page.viewportSize()
    const dialogBox = await dialog.boundingBox()
    const closeBox = await closeButton.boundingBox()
    expect(viewport).not.toBeNull()
    expect(dialogBox).not.toBeNull()
    expect(closeBox).not.toBeNull()
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0)
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width)
    expect(closeBox!.width).toBeGreaterThanOrEqual(44)
    expect(closeBox!.height).toBeGreaterThanOrEqual(44)
  })
})
