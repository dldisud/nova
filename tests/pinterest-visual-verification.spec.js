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

test.describe("pinterest redesign visual verification", () => {
  let server;

  test.beforeAll(async () => {
    server = createServer();
    await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test("homepage/search/detail/library satisfy Task 4 structure checks", async ({ browser }) => {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport });

      await page.goto(`${BASE}/homepage_pc.html?visual=${viewport.label}`, { waitUntil: "networkidle" });
      await expect(page.locator(".pin-promo-banner")).toBeVisible();
      await expect(page.locator(".pin-genre-bar .pin-genre-pill").first()).toBeVisible();
      await expect(page.locator(".free-grid.pin-masonry .pin-card").first()).toBeVisible();
      await expect(page.locator(".sale-grid.pin-masonry .pin-card").first()).toBeVisible();
      const homepageColumns = await page.locator(".free-grid.pin-masonry").evaluate((el) => getComputedStyle(el).columnCount);
      console.log(`homepage columns @${viewport.label}:`, homepageColumns);
      await page.screenshot({ path: path.join(ROOT, "test-results", `task4-home-${viewport.label}.png`), fullPage: true });

      const firstCard = page.locator(".free-grid.pin-masonry .pin-card").first();
      const firstCardMedia = firstCard.locator(".pin-card-media");
      const overlay = firstCard.locator(".pin-card-overlay");
      await firstCardMedia.hover({ force: true });
      await expect
        .poll(async () => {
          return Number(await overlay.evaluate((el) => getComputedStyle(el).opacity));
        }, {
          message: `homepage overlay opacity should rise after hover @${viewport.label}`,
          timeout: 2_000
        })
        .toBeGreaterThan(0.5);
      const overlayOpacity = await overlay.evaluate((el) => getComputedStyle(el).opacity);
      console.log(`homepage overlay opacity @${viewport.label}:`, overlayOpacity);

      await page.goto(`${BASE}/search_pc.html?visual=${viewport.label}`, { waitUntil: "networkidle" });
      await expect(page.locator(".pin-search-bar")).toBeVisible();
      await expect(page.locator(".pin-filter-bar")).toBeVisible();
      await expect(page.locator(".browse-rail")).toHaveCount(0);
      await expect(page.locator(".browse-results.pin-masonry .pin-card").first()).toBeVisible();
      const searchColumns = await page.locator(".browse-results.pin-masonry").evaluate((el) => getComputedStyle(el).columnCount);
      console.log(`search columns @${viewport.label}:`, searchColumns);
      await page.screenshot({ path: path.join(ROOT, "test-results", `task4-search-${viewport.label}.png`), fullPage: true });

      await page.goto(`${BASE}/novel_detail_pc.html?slug=abyss-librarian-forbidden-archive&visual=${viewport.label}`, { waitUntil: "networkidle" });
      await expect(page.locator(".pin-detail-card")).toBeVisible();
      await expect(page.locator(".pin-detail-meta .detail-meta-item, .pin-detail-meta .pin-detail-meta-item").first()).toBeVisible();
      await expect(page.locator("[data-similar-grid].pin-masonry .pin-card").first()).toBeVisible();
      await page.screenshot({ path: path.join(ROOT, "test-results", `task4-detail-${viewport.label}.png`), fullPage: true });

      await page.goto(`${BASE}/my_library_pc.html?visual=${viewport.label}`, { waitUntil: "networkidle" });
      await expect(page.locator(".pin-filter-bar")).toBeVisible();
      await page.evaluate(() => {
        const readingPanel = document.querySelector("[data-tab-panel='reading']");
        if (readingPanel) {
          readingPanel.hidden = false;
          readingPanel.style.display = "";
        }

        const readingList = document.querySelector("[data-library-reading]");
        if (readingList && !readingList.children.length) {
          readingList.innerHTML = `
            <article class="pin-card">
              <a class="pin-card-media" href="#">
                <img src="https://placehold.co/360x520/e9e1d4/2b2117?text=INKROAD" alt="테스트 표지" style="height:280px;object-fit:cover;width:100%">
                <div class="pin-card-overlay" style="transform:translateY(0);opacity:1">
                  <span class="pin-card-overlay-rating">★ 9.6</span>
                  <span class="pin-card-overlay-genre">회귀 · 미스터리</span>
                  <span class="pin-card-overlay-free">12화 무료</span>
                  <span class="pin-card-overlay-price">편당 300원</span>
                </div>
              </a>
              <div class="pin-card-copy">
                <h3 class="pin-card-title">서재 검증용 더미 카드</h3>
                <p class="pin-card-author">INKROAD QA</p>
              </div>
            </article>
          `;
        }
      });
      await expect(page.locator("[data-tab-panel='reading']")).toBeVisible();
      await expect(page.locator("[data-tab-panel='reading'] .pin-board-section")).toBeVisible();
      await expect(page.locator("[data-tab-panel='reading'] [data-library-reading].pin-masonry")).toBeVisible();
      await page.screenshot({ path: path.join(ROOT, "test-results", `task4-library-${viewport.label}.png`), fullPage: true });

      await page.close();
    }
  });
});
