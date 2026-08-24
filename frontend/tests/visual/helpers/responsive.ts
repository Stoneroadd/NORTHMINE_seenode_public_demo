import { expect, type Page, type Locator } from '@playwright/test'

/**
 * Fails if the page has real horizontal overflow (document wider than the
 * viewport). Off-canvas drawers (translateX past the edge) and fixed
 * decorative layers sized via `inset:0` never trigger this, since they
 * don't grow scrollWidth.
 */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth, `document.scrollWidth (${scrollWidth}) should not exceed clientWidth (${clientWidth})`).toBeLessThanOrEqual(clientWidth)
}

/**
 * Lists elements whose rendered box crosses the viewport's left/right edge.
 * Use this in diagnostic runs, not as a hard assertion — legitimate
 * off-canvas drawers, tooltips-in-flight, and `overflow:hidden` marquees
 * will show up here too and need to be filtered by the caller.
 */
export async function findOverflowingElements(page: Page, limit = 15) {
  return page.evaluate((max) => {
    const viewportWidth = document.documentElement.clientWidth
    const out: Array<{ tag: string; className: string; left: number; right: number; width: number }> = []
    for (const element of document.querySelectorAll('body *')) {
      const rect = element.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue
      if (rect.right > viewportWidth + 1 || rect.left < -1) {
        out.push({
          tag: element.tagName,
          className: typeof element.className === 'string' ? element.className.slice(0, 100) : '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        })
        if (out.length >= max) break
      }
    }
    return out
  }, limit)
}

/**
 * Asserts a critical, supposedly-visible element actually has a usable
 * on-screen box. Catches the "grid crushed a column to 0px" class of bug
 * that a scrollWidth check misses entirely (nothing overflows — the
 * content just collapses to nothing).
 */
export async function expectVisibleSize(locator: Locator, minWidth = 2, minHeight = 2) {
  const box = await locator.boundingBox()
  expect(box, `${await describeLocator(locator)} should have a bounding box`).not.toBeNull()
  expect(box!.width, `${await describeLocator(locator)} width`).toBeGreaterThanOrEqual(minWidth)
  expect(box!.height, `${await describeLocator(locator)} height`).toBeGreaterThanOrEqual(minHeight)
}

async function describeLocator(locator: Locator) {
  try {
    return await locator.evaluate((el) => `<${el.tagName.toLowerCase()} class="${(el.className || '').toString().slice(0, 60)}">`)
  } catch {
    return 'locator'
  }
}

/** Waits for network + fonts + images so layout has actually settled before measuring. */
export async function gotoAndSettle(page: Page, path: string, settleMs = 700) {
  await page.goto(path, { waitUntil: 'networkidle', timeout: 30000 })
  await page.evaluate(() => document.fonts.ready).catch(() => undefined)
  await page.waitForTimeout(settleMs)
}

/**
 * Logs in with the intentionally-public synthetic demo credentials (see
 * README_SEENODE_PUBLIC_DEMO.md) and waits for the authenticated shell to
 * actually be interactive. The session lives in memory (no localStorage —
 * see authService.ts), so callers should avoid an extra full-page
 * `page.goto()` right after this; that reload re-triggers the cookie-backed
 * session-restore round trip and can be slow under load. Test bodies that
 * only need `/cockpit` (where this already lands) can skip re-navigating.
 */
export async function loginAsDemo(page: Page) {
  await gotoAndSettle(page, '/acceso-demo', 500)
  await page.fill('input[placeholder="usuario"]', 'demo')
  await page.fill('input[placeholder="contrasena"]', 'demo')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/cockpit', { timeout: 20000 })
  await page.locator('.topbar-menu-button, .topbar').first().waitFor({ state: 'visible', timeout: 20000 })
}

/**
 * Uses the application's current manual router without discarding the
 * in-memory access token. A full page.goto() after login forces an avoidable
 * refresh-cookie restore and made long browser matrices timing-dependent.
 */
export async function navigateWithinApp(page: Page, path: string, settleMs = 500) {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, '', nextPath)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForURL((url) => url.pathname === path, { timeout: 20_000 })
  await page.evaluate(() => document.fonts.ready).catch(() => undefined)
  await page.waitForTimeout(settleMs)
}
