const http = require("http");
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const PORT = 41731;

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
    const filePath = path.join(ROOT, safePath === "/" ? "novel_upload_pc.html" : safePath);

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

test.describe("novel upload preview", () => {
  let server;

  test.beforeAll(async () => {
    server = createServer();
    await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test("clicking preview toggles into preview mode and renders markdown", async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.route("**/assets/supabase-config.js", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: 'window.inkroadSupabaseConfig={url:"https://example.supabase.co",publishableKey:"public-test-key"};',
      });
    });

    await page.route("**/@supabase/supabase-js@2", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `
          window.supabase = {
            createClient() {
              const session = {
                access_token: "test-token",
                user: {
                  id: "user-1",
                  email: "writer@example.com",
                  user_metadata: { display_name: "Writer" }
                }
              };
              return {
                auth: {
                  getSession: async () => ({ data: { session } }),
                  onAuthStateChange(callback) {
                    setTimeout(() => callback("INITIAL_SESSION", session), 0);
                    return { data: { subscription: { unsubscribe() {} } } };
                  },
                  signOut: async () => ({ error: null })
                },
                rpc: async () => ({ data: null, error: null }),
                storage: {
                  from() {
                    return {
                      upload: async () => ({ error: null, data: { path: "fake" } }),
                      getPublicUrl() { return { data: { publicUrl: "https://example.com/fake.png" } }; }
                    };
                  }
                }
              };
            }
          };
        `,
      });
    });

    await page.route("**/assets/supabase-live.js", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
    });

    await page.goto(`http://127.0.0.1:${PORT}/novel_upload_pc.html`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-upload-body]", { state: "visible" });
    await page.fill("[data-upload-body]", "# 프롤로그\n\n**1화**");
    await page.click("[data-upload-preview-toggle]");

    const textarea = page.locator("[data-upload-body]");
    const preview = page.locator("[data-upload-preview]");
    const toggle = page.locator("[data-upload-preview-toggle]");
    await expect(textarea).toBeHidden();
    await expect(preview).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", /true/);
    await expect(preview).toContainText("프롤로그");
    await expect(preview).toContainText("1화");
    const previewHtml = await preview.innerHTML();
    console.log("PREVIEW_HTML_START");
    console.log(previewHtml);
    console.log("PREVIEW_HTML_END");
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
