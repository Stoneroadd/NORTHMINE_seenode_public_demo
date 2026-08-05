import { chromium } from '@playwright/test';
const outDir = 'C:/Users/maste/AppData/Local/Temp/claude/C--Users-maste/4912dd6f-a934-4cd6-9ce7-93936128a8d4/scratchpad/visual';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto('http://127.0.0.1:5220/', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(1000);

const stage = page.locator('.ns-stage__frame');
await page.evaluate(() => document.querySelector('.ns-stage__frame')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(1800); // let the settle timer (1200ms) clear the entrance animation

const box = await stage.boundingBox();
await page.screenshot({ path: `${outDir}/stage-default.png`, clip: { x: box.x - 20, y: box.y - 20, width: box.width + 40, height: box.height + 40 } });

await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.15, { steps: 10 });
await page.waitForTimeout(500);
const transform = await stage.evaluate((el) => getComputedStyle(el).transform);
console.log('stage transform (tilted toward top-left):', transform);
await page.screenshot({ path: `${outDir}/stage-tilted.png`, clip: { x: box.x - 20, y: box.y - 20, width: box.width + 40, height: box.height + 40 } });

await browser.close();
console.log('done');
