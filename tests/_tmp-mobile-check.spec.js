const { test } = require('@playwright/test');

test('capture local mobile home after hero and tab fixes', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/homepage.html?fresh=mobilefix', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '.tmp-mobile-home-local-fix.png', fullPage: true });
});
