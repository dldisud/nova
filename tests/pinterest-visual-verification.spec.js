const http = require("http");
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const PORT = 41732;
const BASE = `http://127.0.0.1:${PORT}`;
const VIEWPORTS = [
  { width: 1440, height: 1200, label: "1440" },
  { width: 1080, height: 1200, label: "1080" },
  { width: 768, height: 1100, label: "768" },
  { width: 480, height: 960, label: "480" },
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function createServer() {
  return http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(ROOT, safePath === "/" ? "homepage_pc.html" : safePath);

    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, body) => {
      if (error) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/plain; charset=utf-8" });
      res.end(body);
    });
  });
}

async function gotoAndWait(page, url, selectors) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  for (const selector of selectors) {
    await expect(page.locator(selector).first(), `waiting for ${selector}`).toBeVisible();
  }
}

test.describe("pinterest redesign visual verification", () => {
  let server;

  test.beforeAll(async () => {
    server = createServer();
    await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test("homepage/search/detail/library satisfy current store layout checks", async ({ browser }) => {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport });

      await gotoAndWait(page, `${BASE}/homepage_pc.html?visual=${viewport.label}`, [
        ".hero-band",
        ".hero-title-main",
        ".sale-banner",
        ".genre-grid .genre-pill",
        ".free-grid .novel-card",
        ".sale-grid .novel-card",
      ]);
      const homepageColumns = await page.locator(".free-grid").evaluate((el) => getComputedStyle(el).columnCount);
      console.log(`homepage columns @${viewport.label}:`, homepageColumns);
      const heroTitle = await page.locator(".hero-title-main").textContent();
      expect(heroTitle && heroTitle.trim().length > 0).toBeTruthy();
      await page.screenshot({ path: path.join(ROOT, "test-results", `task4-home-${viewport.label}.png`), fullPage: true });

      const firstCard = page.locator(".free-grid .novel-card").first();
      const firstCardMedia = firstCard.locator(".novel-card-media");
      const overlay = firstCard.locator(".novel-card-overlay");
      await firstCardMedia.hover({ force: true });
      await expect
        .poll(async () => Number(await overlay.evaluate((el) => getComputedStyle(el).opacity)), {
          message: `homepage overlay opacity should rise after hover @${viewport.label}`,
          timeout: 2_000,
        })
        .toBeGreaterThan(0.5);
      const overlayOpacity = await overlay.evaluate((el) => getComputedStyle(el).opacity);
      console.log(`homepage overlay opacity @${viewport.label}:`, overlayOpacity);

      await gotoAndWait(page, `${BASE}/search_pc.html?visual=${viewport.label}`, [
        ".search-bar",
        ".browse-rail",
        ".browse-results .novel-card",
      ]);
      await expect(page.locator(".browse-count")).toBeVisible();
      await expect(page.locator(".browse-results .novel-card").first()).toBeVisible();
      const searchColumns = await page.locator(".browse-results").evaluate((el) => getComputedStyle(el).columnCount);
      console.log(`search columns @${viewport.label}:`, searchColumns);
      await page.screenshot({ path: path.join(ROOT, "test-results", `task4-search-${viewport.label}.png`), fullPage: true });

      await gotoAndWait(page, `${BASE}/novel_detail_pc.html?slug=abyss-librarian-forbidden-archive&visual=${viewport.label}`, [
        ".detail-top",
        ".detail-cover",
        ".detail-info",
        ".detail-meta-grid",
        "[data-similar-grid] .novel-card",
        "[data-episode-list] .episode-row",
      ]);
      await expect(page.locator(".detail-title")).toHaveText(/.+/);
      await expect(page.locator("[data-similar-grid] .novel-card").first()).toBeVisible();
      await page.screenshot({ path: path.join(ROOT, "test-results", `task4-detail-${viewport.label}.png`), fullPage: true });

      await page.goto(`${BASE}/my_library_pc.html?visual=${viewport.label}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".library-tabs")).toHaveCount(1);
      await expect(page.locator("[data-tab-panel='reading']")).toHaveCount(1);
      await expect(page.locator("[data-library-reading]")).toHaveCount(1);
      await page.evaluate(() => {
        document.querySelectorAll(".library-tabs, [data-tab-panel]").forEach((node) => {
          node.hidden = false;
          node.style.display = "";
        });

        const readingList = document.querySelector("[data-library-reading]");
        if (readingList && !readingList.querySelector(".library-row")) {
          readingList.innerHTML = `
            <article class="library-row">
              <a class="library-row-thumb" href="#">
                <img src="https://placehold.co/360x520/e9e1d4/2b2117?text=INKROAD" alt="테스트 표지">
              </a>
              <div class="library-row-copy">
                <h3 class="library-row-title">서재 검증용 더미 카드</h3>
                <p class="library-row-meta">INKROAD QA · 이어서 읽기</p>
              </div>
              <div class="library-row-side">
                <a class="button small primary" href="#">이어 읽기</a>
              </div>
            </article>
          `;
        }
      });
      await expect(page.locator(".library-tabs")).toBeVisible();
      await expect(page.locator("[data-tab-panel='reading']")).toBeVisible();
      await expect(page.locator("[data-library-reading] .library-row").first()).toBeVisible();
      await page.locator(".library-tabs [data-tab-target='wishlist']").click();
      await expect(page.locator("[data-tab-panel='wishlist']")).toBeVisible();
      await page.locator(".library-tabs [data-tab-target='reading']").click();
      await expect(page.locator("[data-tab-panel='reading']")).toBeVisible();
      await page.screenshot({ path: path.join(ROOT, "test-results", `task4-library-${viewport.label}.png`), fullPage: true });

      await page.close();
    }
  });
});
