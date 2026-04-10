const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testIgnore: [
    "**/_tmp-*.spec.js",
    "**/_recovery_snapshots/**",
  ],
  timeout: 60_000,
  use: {
    trace: "on-first-retry",
  },
});
