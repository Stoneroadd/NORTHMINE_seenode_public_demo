import { chromium } from '@playwright/test';
const outDir = 'C:/Users/maste/AppData/Local/Temp/claude/C--Users-maste/4912dd6f-a934-4cd6-9ce7-93936128a8d4/scratchpad/visual';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto('http://127.0.0.1:5220/', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(1500);

// letters, off-center pull
const span = page.locator('.ns-hero__title span[aria-hidden="true"]').nth(5);
const box = await span.boundingBox();
await page.mouse.move(box.x - 15, box.y - 15, { steps: 8 });
await page.waitForTimeout(400);
const charTransform = await span.evaluate((el) => getComputedStyle(el).transform);
console.log('char transform (offset cursor, should show x/y translate):', charTransform);

// button magnetic + glow + press
const btn = page.locator('.ns-btn--primary').first();
const btnBox = await btn.boundingBox();
await page.mouse.move(btnBox.x + btnBox.width * 0.85, btnBox.y + btnBox.height / 2, { steps: 8 });
await page.waitForTimeout(400);
const btnTransform = await btn.evaluate((el) => getComputedStyle(el).transform);
console.log('button transform (pulled toward cursor):', btnTransform);
await page.screenshot({ path: `${outDir}/magnetic-btn2.png`, clip: { x: btnBox.x - 30, y: btnBox.y - 30, width: btnBox.width + 60, height: btnBox.height + 60 } });

await page.mouse.down();
await page.waitForTimeout(180);
const btnPress = await btn.evaluate((el) => getComputedStyle(el).transform);
console.log('button transform on press (should include scale ~0.96):', btnPress);
await page.mouse.up();

await browser.close();
console.log('done');
