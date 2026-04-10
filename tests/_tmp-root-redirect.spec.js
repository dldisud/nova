const { test, expect } = require('@playwright/test');

test('mobile root goes to mobile homepage', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('https://inkroad.netlify.app/', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/homepage\.html$/);
});

test('desktop root goes to pc homepage', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
  await page.goto('https://inkroad.netlify.app/', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/homepage_pc\.html$/);
});
