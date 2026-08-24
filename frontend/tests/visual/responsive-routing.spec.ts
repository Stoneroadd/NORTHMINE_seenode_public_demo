import { expect, test, type Locator } from '@playwright/test'
import { appPaths } from '../../src/lib/appRoutes'
import { loginAsDemo, navigateWithinApp } from './helpers/responsive'

type ElementBox = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>

async function waitForStableBox(locator: Locator): Promise<ElementBox> {
  let previous = await locator.boundingBox()
  expect(previous).not.toBeNull()

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await locator.page().waitForTimeout(100)
    const current = await locator.boundingBox()
    expect(current).not.toBeNull()
    if (
      Math.abs(current!.x - previous!.x) < 0.25
      && Math.abs(current!.y - previous!.y) < 0.25
      && Math.abs(current!.width - previous!.width) < 0.25
      && Math.abs(current!.height - previous!.height) < 0.25
    ) {
      return current!
    }
    previous = current
  }

  throw new Error('Operational Flow node did not reach stable geometry')
}

test.describe('canonical authenticated routing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
  })

  test('Operational Flow is discoverable from operational navigation', async ({ page }) => {
    if ((page.viewportSize()?.width ?? 1200) < 860) {
      await page.locator('.topbar-menu-button').click()
    }

    const entry = page.locator('button[title^="Operational Flow:"]')
    await expect(entry).toBeVisible()
    await entry.click({ noWaitAfter: true })

    await page.waitForURL((url) => url.pathname === appPaths.operationalFlow)
    await expect(page.locator('.mc-flow-context h1')).toHaveText('Operational Flow')
    await expect(entry).toHaveClass(/is-active/)
    await expect(page.getByPlaceholder('usuario')).toHaveCount(0)

    const inspector = page.locator('.mc-flow-inspector')
    await expect(inspector.getByText('Unidad de carguío', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Datos actualizados', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Escenario sintético', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Hecho de fuente', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Alimenta', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Carga', { exact: true })).toBeVisible()

    const operationalText = await page.locator('main').innerText()
    expect(operationalText).not.toMatch(/\b(?:LOADING_UNIT|FEEDS|LOADS|FACT|FRESH|SYNTHETIC|CONFIRMED|S01)\b/)
  })

  test('Mission Control and analysis routes survive history navigation', async ({ page }) => {
    await navigateWithinApp(page, `${appPaths.operationalFlow}/`)
    await expect(page.locator('.mc-flow-context h1')).toHaveText('Operational Flow')

    if ((page.viewportSize()?.width ?? 1200) < 860) {
      await page.locator('.topbar-menu-button').click()
    }
    await page.locator(`a[href="${appPaths.prediccion}"]`).click()
    await page.waitForURL((url) => url.pathname === appPaths.prediccion)
    await expect(page.locator('canvas:not(.matrix-rain):not([aria-hidden="true"])').first()).toBeVisible({ timeout: 15_000 })

    await page.goBack()
    await page.waitForURL((url) => url.pathname === `${appPaths.operationalFlow}/`)
    await expect(page.locator('.mc-flow-context h1')).toHaveText('Operational Flow')

    await page.goForward()
    await page.waitForURL((url) => url.pathname === appPaths.prediccion)
    await expect(page.locator('.topbar')).toBeVisible()
    await expect(page.getByPlaceholder('usuario')).toHaveCount(0)
  })

  test('Operational Flow nodes keep geometry and selection context', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await navigateWithinApp(page, appPaths.operationalFlow)
    await expect(page.locator('.mc-flow-context h1')).toHaveText('Operational Flow')

    const isMobile = (page.viewportSize()?.width ?? 1200) <= 760
    for (const label of ['PH03', 'Ruta Norte', 'Tonelaje']) {
      const node = page.getByRole('button', { name: new RegExp(`^${label}\\.`) }).filter({ visible: true })
      await expect(node).toBeVisible()
      await node.scrollIntoViewIfNeeded()
      const before = await waitForStableBox(node)

      if (isMobile) {
        await node.click()
      } else {
        const transformBefore = await node.getAttribute('transform')
        await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
        await page.waitForTimeout(120)
        const afterHover = await node.boundingBox()
        expect(afterHover).not.toBeNull()
        expect(afterHover!.x).toBeCloseTo(before.x, 1)
        expect(afterHover!.y).toBeCloseTo(before.y, 1)
        expect(afterHover!.width).toBeCloseTo(before.width, 1)
        expect(afterHover!.height).toBeCloseTo(before.height, 1)
        expect(await node.getAttribute('transform')).toBe(transformBefore)
        await node.focus()
        await page.keyboard.press('Enter')
      }

      await expect(page.locator('#mc-flow-inspector-title')).toHaveText(label)
    }

    expect(pageErrors).toEqual([])
  })

  test('Operational Flow stops active propagation at unknown cost and after recovery', async ({ page }) => {
    await navigateWithinApp(page, appPaths.operationalFlow)
    await expect(page.locator('.mc-flow-context h1')).toHaveText('Operational Flow')

    const plan = page.getByRole('button', { name: /^Plan turno\./ }).filter({ visible: true })
    const cost = page.getByRole('button', { name: /^Impacto costo\./ }).filter({ visible: true })
    await expect(plan).toHaveAttribute('aria-label', /Impactado por el evento activo/)
    await expect(cost).not.toHaveAttribute('aria-label', /Impactado por el evento activo/)

    await page.getByRole('button', { name: /Recuperada/ }).click()
    await expect(page.locator('.mc-flow-situation__status')).toContainText('Normalizado')
    const visibleNodeLabels = await page.locator('.mc-flow-node:visible, .mc-flow-mobile-node:visible').evaluateAll(
      nodes => nodes.map(node => node.getAttribute('aria-label') ?? ''),
    )
    expect(visibleNodeLabels.some(label => label.includes('Impactado por el evento activo'))).toBe(false)
  })

  test('Operational Flow inspector names relationship direction and counterpart', async ({ page }) => {
    await navigateWithinApp(page, appPaths.operationalFlow)
    const inspector = page.locator('.mc-flow-inspector')

    await expect(inspector.getByText('Desde Frente 03', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Hacia 6 CAEX', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /^Ruta Norte\./ }).filter({ visible: true }).click()
    await expect(inspector.getByText('Desde 6 CAEX', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Hacia Chancador 01', { exact: true })).toBeVisible()
    await expect(inspector.getByText('Hacia Velocidad \/ ciclo', { exact: true })).toBeVisible()
  })

  test('Operational Flow qualifies uncertain relationships without false precision', async ({ page }) => {
    await navigateWithinApp(page, appPaths.operationalFlow)
    await page.getByRole('button', { name: /^Impacto costo\./ }).filter({ visible: true }).click()

    const inspector = page.locator('.mc-flow-inspector')
    const relationships = inspector.locator('.mc-flow-inspector__relations')
    await expect(relationships.getByText(/Hipótesis · Confianza baja · desde/)).toBeVisible()
    await expect(relationships).not.toContainText('35%')
    await expect(relationships).not.toContainText('0,35')
  })

  test('Operational Flow emphasizes only the selected node connections', async ({ page }) => {
    await navigateWithinApp(page, appPaths.operationalFlow)
    await page.getByRole('button', { name: /^Ruta Norte\./ }).filter({ visible: true }).click()

    for (const relationshipId of ['rel-trucks-route', 'rel-route-destination', 'rel-route-cycle']) {
      await expect(page.locator(`[data-relationship-id="${relationshipId}"]`)).toHaveClass(/is-contextual/)
    }
    await expect(page.locator('[data-relationship-id="rel-plan-cost"]')).toHaveClass(/is-muted/)
    await expect(page.locator('[data-relationship-id="rel-plan-cost"]')).not.toHaveClass(/is-contextual/)
  })
})
