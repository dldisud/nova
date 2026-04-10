const { test } = require('@playwright/test');

test('capture mobile home and auth', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto('https://inkroad.netlify.app/homepage.html?fresh=1', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '.tmp-mobile-home.png', fullPage: true });
  await page.goto('https://inkroad.netlify.app/auth_pc.html?fresh=1', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '.tmp-mobile-auth.png', fullPage: true });
});
