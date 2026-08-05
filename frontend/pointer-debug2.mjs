import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://127.0.0.1:5220/', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const h1 = document.querySelector('.ns-hero__title');
  const firstSpan = h1.querySelector('span[aria-hidden="true"]');
  return {
    outerHTML: h1.outerHTML.slice(0, 600),
    firstSpanHTML: firstSpan.outerHTML,
    firstSpanChildCount: firstSpan.childNodes.length,
    nestedSpanCount: h1.querySelectorAll('span span').length,
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
