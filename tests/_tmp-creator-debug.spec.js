const { test, expect } = require('@playwright/test');

test('creator dashboard debug', async ({ page }) => {
  page.on('console', msg => console.log('console:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('pageerror:', err.message));
  await page.goto('http://127.0.0.1:4173/creator_dashboard_pc.html?inspect=3', { waitUntil: 'networkidle' });
  const authHtml = await page.locator('[data-creator-auth]').innerHTML();
  console.log('AUTH', JSON.stringify(authHtml));
  await expect(page.locator('[data-creator-auth] .auth-card')).toBeVisible();
});
