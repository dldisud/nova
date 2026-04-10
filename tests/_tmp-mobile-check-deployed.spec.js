const { test } = require('@playwright/test');

test('capture deployed mobile home after latest fixes', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true });
  await page.goto('https://inkroad.netlify.app/homepage.html?fresh=fix2', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '.tmp-mobile-home-deployed-fix2.png', fullPage: true });
});
