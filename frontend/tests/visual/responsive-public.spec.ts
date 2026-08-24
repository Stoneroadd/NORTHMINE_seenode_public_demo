import { test, expect } from '@playwright/test'
import { expectNoHorizontalOverflow, expectVisibleSize, gotoAndSettle } from './helpers/responsive'

const PUBLIC_ROUTES = [
  { path: '/', label: 'landing (SaaS)' },
  { path: '/origen', label: 'origin story' },
  { path: '/solicitar-demo', label: 'demo request form' },
  { path: '/solicitud-recibida', label: 'demo request success' },
  { path: '/privacy', label: 'privacy' },
  { path: '/acceso-demo', label: 'public login' },
]

for (const { path, label } of PUBLIC_ROUTES) {
  test(`${label} (${path}) — no horizontal overflow`, async ({ page }) => {
    await gotoAndSettle(page, path)
    await expectNoHorizontalOverflow(page)
  })
}

test('landing — hero and primary CTA stay visible', async ({ page }) => {
  await gotoAndSettle(page, '/')
  await expectVisibleSize(page.locator('.ns-header').first())
  await expectVisibleSize(page.getByRole('heading', { level: 1 }).first())
})

test('landing — critical images keep high priority without React DOM warnings', async ({ page }) => {
  const reactDomWarnings: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('React does not recognize')) {
      reactDomWarnings.push(message.text())
    }
  })

  await gotoAndSettle(page, '/')
  await expect(page.locator('img[fetchpriority="high"]')).toHaveCount(2)
  expect(reactDomWarnings).toEqual([])
})

test('demo request form — inputs are actually usable, not crushed to 0px', async ({ page }) => {
  await gotoAndSettle(page, '/solicitar-demo')
  const form = page.locator('.nm-demo-request-form')
  await expectVisibleSize(form, 100, 100)
  // regression guard for the grid-collision bug: the form column must claim
  // a meaningful share of the viewport, not be squeezed to a sliver by a
  // sibling column's hard minmax() floor.
  const [formBox, viewport] = await Promise.all([form.boundingBox(), page.viewportSize()])
  expect(formBox).not.toBeNull()
  expect(formBox!.width).toBeGreaterThan((viewport?.width ?? 0) * 0.25)
})

test('demo request form — email input accepts input and stays within viewport', async ({ page }) => {
  await gotoAndSettle(page, '/solicitar-demo')
  const email = page.locator('input[type="email"]')
  await expectVisibleSize(email, 80, 20)
  await email.fill('audit@example.com')
  await expect(email).toHaveValue('audit@example.com')
})

test('login — brand subtitle renders on a single line (no mid-word wrap)', async ({ page }) => {
  await gotoAndSettle(page, '/acceso-demo')
  const subtitle = page.locator('.brand-intelligence').first()
  await expectVisibleSize(subtitle)
  const lineCount = await subtitle.evaluate((el) => el.getClientRects().length)
  expect(lineCount, '.brand-intelligence should not wrap across viewports down to the smallest tested device').toBe(1)
})

test('login — username/password fields and submit stay reachable', async ({ page }) => {
  await gotoAndSettle(page, '/acceso-demo')
  await expectVisibleSize(page.locator('input[placeholder="usuario"]'), 80, 20)
  await expectVisibleSize(page.locator('input[placeholder="contrasena"]'), 80, 20)
  await expectVisibleSize(page.locator('button[type="submit"]'), 80, 20)
})
