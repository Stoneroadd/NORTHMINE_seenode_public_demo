import { test, expect, type Page } from '@playwright/test'

const URL = '/brand-prototype'
const SETTLE_MS = 1800

async function gotoAndSettle(page: Page, settleMs = SETTLE_MS) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('img:not([loading="lazy"])'))
      .every((img) => (img as HTMLImageElement).complete),
  )
  await page.waitForTimeout(settleMs)
}

async function waitForImagesIn(page: Page, selector: string) {
  await page.waitForFunction(
    (sel) => Array.from(document.querySelectorAll(`${sel} img`))
      .every((img) => (img as HTMLImageElement).complete),
    selector,
  )
}

test.describe('ORIGIN brand story', () => {
  test('hero — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 })
    await gotoAndSettle(page)
    await expect(page.locator('.no-skip')).toHaveCount(0)
    await expect(page.locator('.no-hero')).toHaveScreenshot('origin-hero-desktop.png')
  })

  test('hero — mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoAndSettle(page)
    await expect(page.locator('.no-skip')).toHaveCount(0)
    await expect(page.locator('.no-hero')).toHaveScreenshot('origin-hero-mobile.png')
  })

  test('first operational chapter', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 })
    await gotoAndSettle(page)
    await page.locator('.no-chapter').first().scrollIntoViewIfNeeded()
    await waitForImagesIn(page, '.no-chapter')
    await page.waitForTimeout(900)
    await expect(page.locator('.no-chapter').first()).toHaveScreenshot('origin-first-line.png')
  })

  test('operational questions', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1200 })
    await gotoAndSettle(page)
    await page.locator('#preguntas').scrollIntoViewIfNeeded()
    await page.waitForTimeout(900)
    await expect(page.locator('#preguntas')).toHaveScreenshot('origin-questions.png')
  })

  test('product evidence', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1200 })
    await gotoAndSettle(page)
    await page.locator('#northmine').scrollIntoViewIfNeeded()
    await waitForImagesIn(page, '#northmine')
    await page.waitForTimeout(1200)
    await expect(page.locator('.no-product__hero')).toHaveScreenshot('origin-product-evidence.png')
  })

  test('final CTA', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 })
    await gotoAndSettle(page)
    await page.locator('.no-final').scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await expect(page.locator('.no-final')).toHaveScreenshot('origin-final-cta.png')
  })

  test('reduced motion shows final state immediately', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1600, height: 1000 })
    await gotoAndSettle(page, 300)
    const opacities = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-hero]')).map((el) => getComputedStyle(el).opacity),
    )
    expect(opacities.every((opacity) => opacity === '1')).toBe(true)
  })

  test('responsive viewports have no horizontal overflow', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport)
      await gotoAndSettle(page, 150)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow, `${viewport.width}x${viewport.height}`).toBe(false)
    }
    await expect(page.locator('.no-product__modules article')).toHaveCount(6)
  })
})
