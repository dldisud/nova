const { test } = require('@playwright/test');

test('capture deployed mobile home', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto('https://inkroad.netlify.app/homepage.html?fresh=promo', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '.tmp-mobile-home-deployed.png', fullPage: true });
});
