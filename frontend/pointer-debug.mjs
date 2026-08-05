import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('console', (m) => console.log('[console]', m.text()));
await page.goto('http://127.0.0.1:5220/', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(1200);

const info = await page.evaluate(() => {
  const h1 = document.querySelector('.ns-hero__title');
  const firstSpan = h1.querySelector('span[aria-hidden="true"]');
  const rect = firstSpan.getBoundingClientRect();
  const cs = getComputedStyle(firstSpan);
  return {
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    display: cs.display,
    h1Transform: getComputedStyle(h1).transform,
    h1Opacity: getComputedStyle(h1).opacity,
  };
});
console.log('firstSpan info:', JSON.stringify(info, null, 1));

// move mouse exactly to the ACTUAL current rect center
const cx = info.rect.left + info.rect.width / 2;
const cy = info.rect.top + info.rect.height / 2;
console.log('moving mouse to', cx, cy);
await page.mouse.move(cx, cy, { steps: 10 });
await page.waitForTimeout(500);

const after = await page.evaluate(() => {
  const span = document.querySelector('.ns-hero__title span[aria-hidden="true"]');
  return { transform: getComputedStyle(span).transform };
});
console.log('after move, transform:', JSON.stringify(after));

await browser.close();
