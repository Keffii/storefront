import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3300);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Screenshot regression tests. Baselines are rendered on Linux in GitHub
 * Actions (fonts render slightly differently per OS), so they only run in
 * CI. Refresh them with the "Update visual baselines" workflow after an
 * intended design change.
 */
export default defineConfig({
  testDir: "tests/visual",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never", outputFolder: "playwright-visual-report" }]] : "list",
  expect: {
    // An absolute pixel budget: baselines come from the same runner image, so
    // real noise is tiny, and a ratio would let a changed heading slip through
    // on a tall full-page screenshot (1 % of a page is a lot of pixels).
    toHaveScreenshot: { maxDiffPixels: 200, animations: "disabled", caret: "hide" },
  },
  use: {
    baseURL,
    locale: "sv-SE",
    timezoneId: "Europe/Stockholm",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run start -- -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
