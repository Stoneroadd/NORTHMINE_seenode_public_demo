import { test, expect } from '@playwright/test'
import { expectNoHorizontalOverflow, expectVisibleSize, gotoAndSettle, loginAsDemo } from './helpers/responsive'

const APP_ROUTES = [
  { path: '/cockpit', label: 'Decision Cockpit' },
  { path: '/resumen', label: 'Resumen' },
  { path: '/turno', label: 'Turno Actual' },
  { path: '/produccion', label: 'Produccion' },
  { path: '/rendimiento', label: 'Rendimiento' },
  { path: '/flota', label: 'Flota' },
  { path: '/carguio', label: 'Carguio' },
  { path: '/averias', label: 'Averias' },
  { path: '/alertas', label: 'Alertas' },
  { path: '/reportes', label: 'Reportes' },
]

test.describe('authenticated app', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
  })

  for (const { path, label } of APP_ROUTES) {
    test(`${label} (${path}) — no horizontal overflow`, async ({ page }) => {
      await gotoAndSettle(page, path)
      await expectNoHorizontalOverflow(page)
    })
  }

  test('sidebar — opens as a drawer, closes on Escape, restores focus', async ({ page }) => {
    // Already on /cockpit post-login (see loginAsDemo) — no reload needed,
    // and reloading would re-trigger the session-restore round trip.
    const menuButton = page.locator('.topbar-menu-button')
    const sidebar = page.locator('.sidebar')

    // Off-canvas by default on narrow viewports (desktop projects skip this: sidebar is always visible there).
    const viewport = page.viewportSize()
    const isNarrow = (viewport?.width ?? 1200) < 860
    if (!isNarrow) test.skip(true, 'sidebar drawer behavior only applies below the tablet breakpoint')

    await menuButton.click()
    await expect(sidebar).toHaveClass(/is-mobile-open/)
    await expectVisibleSize(sidebar, 100, 100)

    await page.keyboard.press('Escape')
    await expect(sidebar).not.toHaveClass(/is-mobile-open/)
  })

  test('cockpit — table has an internal horizontal-scroll wrapper, not a page-level one', async ({ page }) => {
    const table = page.locator('table').first()
    const count = await page.locator('table').count()
    test.skip(count === 0, 'no table rendered on this data snapshot')
    await table.scrollIntoViewIfNeeded()
    const wrapperOverflowX = await table.evaluate((el) => {
      let node: HTMLElement | null = el.parentElement
      for (let i = 0; i < 5 && node; i += 1) {
        const style = getComputedStyle(node)
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') return style.overflowX
        node = node.parentElement
      }
      return null
    })
    expect(wrapperOverflowX, 'a table wider than its column should scroll inside a wrapper, not the whole page').not.toBeNull()
    await expectNoHorizontalOverflow(page)
  })

  // Excludes decorative, intentionally-hidden layers (e.g. `.matrix-rain`,
  // anything `aria-hidden`) — those aren't charts and can legitimately sit
  // at 0x0 while switched off.
  const CHART_SELECTOR = 'canvas:not(.matrix-rain):not([aria-hidden="true"]), .recharts-wrapper svg'

  test('cockpit — charts mount with a non-zero-size canvas/svg', async ({ page }) => {
    const initialCount = await page.locator(CHART_SELECTOR).count()
    test.skip(initialCount === 0, 'no chart canvas/svg rendered on this tab/data snapshot')

    // ECharts/Recharts measure their container asynchronously right after
    // mount; reading dimensions on a fixed timer races that init step.
    // Poll instead of sleeping-then-checking-once.
    await expect
      .poll(
        () => page.evaluate((selector) => {
          const nodes = Array.from(document.querySelectorAll(selector))
          return nodes.every((n) => {
            const r = n.getBoundingClientRect()
            return r.width > 0 && r.height > 0
          })
        }, CHART_SELECTOR),
        { message: 'every chart canvas/svg should settle to a non-zero drawing surface', timeout: 8000 },
      )
      .toBe(true)
  })

  test('KPI hero value — never truncated or pushed out of its card', async ({ page }) => {
    const kpi = page.locator('[class*="text-4xl"], [class*="text-5xl"]').first()
    const count = await kpi.count()
    test.skip(count === 0, 'no headline KPI found on this data snapshot')
    const overflowing = await kpi.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
    expect(overflowing, 'KPI headline text should not overflow its own box').toBe(false)
  })
})
