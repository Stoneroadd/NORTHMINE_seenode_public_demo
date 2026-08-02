import { test, expect, type Page } from '@playwright/test'

const URL = '/brand-prototype'

// GSAP tweens are JS-driven (rAF), not CSS transitions/animations, so
// there's no CSS "animation-duration: 0" trick that stops them. Stability
// instead comes from: (a) reduced-motion tests, where our own code sets
// the final state synchronously with no tween at all, and (b) a fixed
// settle wait long enough for every scroll-triggered timeline on this
// page (verified during development, none exceed ~2s) to finish.
const SETTLE_MS = 2800

async function gotoAndSettle(page: Page, { settleMs = SETTLE_MS }: { settleMs?: number } = {}) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  // Only the eager (above-the-fold) images need to be loaded here — most
  // images on this page are loading="lazy" and won't fetch at all until
  // scrolled into view, so waiting on ALL <img> elements would hang.
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('img:not([loading="lazy"])')).every((img) => (img as HTMLImageElement).complete),
  )
  // The scroll-progress bar's width is a function of exact scroll position;
  // hide it so pixel-level scroll jitter between runs can't fail a diff.
  await page.addStyleTag({ content: '.ns-scroll-progress { display: none !important; }' })
  await page.waitForTimeout(settleMs)
}

/** For sections reached by scrolling: wait for that container's own images (lazy or not). */
async function waitForImagesIn(page: Page, selector: string) {
  await page.waitForFunction(
    (sel) => Array.from(document.querySelectorAll(`${sel} img`)).every((img) => (img as HTMLImageElement).complete),
    selector,
  )
}

test.describe('brand-prototype visual', () => {
  test('hero — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 })
    await gotoAndSettle(page)
    await expect(page.locator('.ns-hero')).toHaveScreenshot('hero-desktop.png')
  })

  test('hero — mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoAndSettle(page)
    await expect(page.locator('.ns-hero')).toHaveScreenshot('hero-mobile.png')
  })

  test('product stage — main capture', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 })
    await gotoAndSettle(page)
    await expect(page.locator('.ns-stage__frame')).toHaveScreenshot('product-stage.png')
  })

  test('module gallery', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1200 })
    await gotoAndSettle(page)
    await page.locator('#modulos').scrollIntoViewIfNeeded()
    // The card grid uses Motion's `layout` prop, which keeps re-measuring
    // for a bit after mount; give it extra room beyond the usual settle
    // before asking for a pixel-stable screenshot.
    await page.waitForTimeout(SETTLE_MS + 1500)
    await expect(page.locator('.ns-gallery')).toHaveScreenshot('module-gallery.png', { timeout: 15_000 })
  })

  test('module gallery — filtered', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1200 })
    await gotoAndSettle(page)
    await page.locator('#modulos').scrollIntoViewIfNeeded()
    await page.waitForTimeout(SETTLE_MS)
    await page.getByRole('tab', { name: 'Riesgo' }).click()
    await page.waitForTimeout(500)
    await expect(page.locator('.ns-gallery__grid')).toHaveScreenshot('module-gallery-filtered.png')
  })

  test('final CTA', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 })
    await gotoAndSettle(page)
    await page.locator('#cta').scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await expect(page.locator('.ns-cta')).toHaveScreenshot('final-cta.png')
  })

  test('reduced motion — hero shows final state immediately', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1600, height: 1000 })
    // Deliberately short settle: reduced motion must not need the animated
    // budget above — if it does, that's the bug this test exists to catch.
    await gotoAndSettle(page, { settleMs: 300 })
    await expect(page.locator('.ns-hero')).toHaveScreenshot('hero-reduced-motion.png')

    const opacities = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-hero-badge], [data-hero-title], [data-hero-lead], [data-hero-actions]')).map(
        (el) => getComputedStyle(el).opacity,
      ),
    )
    expect(opacities.every((o) => o === '1')).toBe(true)
  })

  test('reduced motion — no horizontal overflow, filters still work', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoAndSettle(page, { settleMs: 300 })

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)

    await page.locator('#modulos').scrollIntoViewIfNeeded()
    await page.getByRole('tab', { name: 'Equipos' }).click()
    await expect(page.getByRole('tab', { name: 'Equipos' })).toHaveAttribute('aria-selected', 'true')
  })
})
