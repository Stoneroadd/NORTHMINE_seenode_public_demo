import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsDemo } from './helpers/responsive'

const ROUTE = '/mission-control/design-system'

async function openCatalog(page: Page) {
  await loginAsDemo(page)
  // The legacy shell has no router and unknown paths collapse to `cockpit`.
  // Move through a distinct known section first so both popstate updates
  // produce a React state transition while preserving the in-memory session.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/resumen')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForURL('**/resumen')
  await page.evaluate((route) => {
    window.history.pushState({}, '', route)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, ROUTE)
  await expect(page.getByRole('heading', { name: 'Mission Control primitives' })).toBeVisible({ timeout: 20_000 })
  await page.evaluate(() => document.fonts.ready)
}

test('desktop catalog communicates condition, impact and evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const pageErrors: string[] = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await openCatalog(page)
  await expect(page.getByText('PH03 detenido')).toBeVisible()
  await expect(page.locator('.mc-event').getByText('6 camiones afectados')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Detalle del evento PH03', includeHidden: true })).toBeHidden()
  await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: 'Inspeccionar', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Detalle del evento PH03' })).toBeVisible()
  await page.getByText('Evidencia', { exact: true }).click()
  await expect(page.getByText('Datos sintéticos determinísticos')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ocultar detalle', exact: true })).toHaveAttribute('aria-expanded', 'true')
  for (const label of ['Datos actualizados', 'Datos operacionales retrasados', 'Datos incompletos', 'Datos en conflicto', 'Datos no disponibles']) {
    await expect(page.getByLabel(label).last()).toBeVisible()
  }
  await expect(page).toHaveScreenshot('mission-control-phase2-desktop.png', { fullPage: true })

  await page.clock.install()
  const retryButton = page.getByRole('button', { name: 'Reintentar historial' })
  await retryButton.click()
  await expect(page.getByText('Recuperando historial')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recuperando…' })).toBeFocused()
  await page.clock.runFor(600)
  await expect(page.getByText('Historial recuperado')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Historial disponible' })).toBeFocused()
  expect(pageErrors).toEqual([])
})

test('mobile catalog prioritizes the current condition without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 })
  await openCatalog(page)
  await expect(page.getByText('PH03 detenido')).toBeVisible()
  const inspectButton = page.getByRole('button', { name: 'Inspeccionar', exact: true })
  await expect(inspectButton).toHaveCSS('min-height', '44px')
  await inspectButton.click()
  await page.getByText('Evidencia', { exact: true }).click()
  await expect(page.getByText('Datos sintéticos determinísticos')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('mission-control-phase2-mobile.png', { fullPage: true })
})

test('tablet catalog preserves hierarchy and open inspector', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await openCatalog(page)
  await page.getByRole('button', { name: 'Inspeccionar', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Detalle del evento PH03' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('mission-control-phase2-tablet.png', { fullPage: true })
})

test('reduced motion keeps the catalog usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1024, height: 768 })
  await openCatalog(page)
  const inspectButton = page.getByRole('button', { name: 'Inspeccionar', exact: true })
  await expect(inspectButton).toBeVisible()
  await expect(inspectButton).toHaveCSS('transition-duration', '0.001s')
})
