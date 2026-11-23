import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
    locale: "zh-CN",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    },
  },
  webServer: {
    command: "pnpm --filter @quality-platform/web dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1512, height: 823 } } },
    { name: "compact", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
});
