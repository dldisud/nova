const { test } = require('@playwright/test');
for (const name of ['homepage_pc.html','search_pc.html','novel_detail_pc.html','creator_dashboard_pc.html','novel_upload_pc.html']) {
  test(name, async ({ page }) => {
    await page.goto(`http://127.0.0.1:4173/${name}?inspect=1`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `.tmp-${name}.png`, fullPage: true });
    console.log(name, await page.title());
  });
}
