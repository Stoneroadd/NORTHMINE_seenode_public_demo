import { chromium } from '@playwright/test';
const outDir = 'C:/Users/maste/AppData/Local/Temp/claude/C--Users-maste/4912dd6f-a934-4cd6-9ce7-93936128a8d4/scratchpad/visual';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto('http://127.0.0.1:5220/', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(1000);
await page.locator('#modulos').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);

const card = page.locator('.ns-gallery__card-frame').first();
const cardBox = await card.boundingBox();
await page.screenshot({ path: `${outDir}/tilt-default.png`, clip: { x: cardBox.x - 15, y: cardBox.y - 15, width: cardBox.width + 30, height: cardBox.height + 30 } });

await page.mouse.move(cardBox.x + cardBox.width * 0.12, cardBox.y + cardBox.height * 0.12, { steps: 10 });
await page.waitForTimeout(500);
const cardTransform = await card.evaluate((el) => getComputedStyle(el).transform);
console.log('card transform (tilted toward top-left corner):', cardTransform);
await page.screenshot({ path: `${outDir}/tilt-active.png`, clip: { x: cardBox.x - 15, y: cardBox.y - 15, width: cardBox.width + 30, height: cardBox.height + 30 } });

// nav letters
const navLink = page.locator('.ns-header__nav a[data-magnetic-text]').first();
const navBox = await navLink.boundingBox();
await page.mouse.move(navBox.x + navBox.width / 2, navBox.y + navBox.height / 2, { steps: 8 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/nav-magnetic.png`, clip: { x: navBox.x - 30, y: navBox.y - 25, width: navBox.width + 60, height: navBox.height + 50 } });

console.log('page errors:', JSON.stringify(errors));
await browser.close();
console.log('done');
