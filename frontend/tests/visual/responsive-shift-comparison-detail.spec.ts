import { test, expect } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsDemo } from './helpers/responsive'

async function openShiftComparison(page: import('@playwright/test').Page) {
  await loginAsDemo(page)

  const trigger = page.locator('.nmcp-shift-equipment-row').first()
  await trigger.waitFor({ state: 'visible', timeout: 30_000 })
  return trigger
}

test.describe('cockpit shift-comparison detail dialog', () => {
  test('contains focus, closes on Escape and restores its equipment row', async ({ page }) => {
    const trigger = await openShiftComparison(page)

    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(trigger).toHaveAttribute('aria-controls', 'northmine-shift-comparison-detail')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.click()

    const dialog = page.locator('#northmine-shift-comparison-detail')
    const closeButton = dialog.getByRole('button', { name: /cerrar/i })
    await expect(dialog).toHaveRole('dialog')
    await expect(dialog).toBeVisible()
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

  test('stays within the viewport with a touch-safe close action', async ({ page }) => {
    const trigger = await openShiftComparison(page)
    await trigger.click()

    const dialog = page.locator('#northmine-shift-comparison-detail')
    const closeButton = dialog.getByRole('button', { name: /cerrar/i })
    await expect(dialog).toBeVisible()
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
