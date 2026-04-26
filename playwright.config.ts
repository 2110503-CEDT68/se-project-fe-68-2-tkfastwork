import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
    testDir: "./e2e",
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: true,
    retries: 0,
    reporter: [["list"]],
    use: {
        baseURL: BASE_URL,
        trace: "retain-on-failure",
        viewport: { width: 1280, height: 800 },
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: process.env.PLAYWRIGHT_NO_WEBSERVER
        ? undefined
        : {
              command: "npm run dev",
              url: BASE_URL,
              reuseExistingServer: !process.env.CI,
              timeout: 120_000,
              env: {
                  NEXT_PUBLIC_BACKEND_URL: "http://mocked-backend.local",
                  NEXTAUTH_SECRET: "test-secret-for-playwright",
                  NEXTAUTH_URL: BASE_URL,
              },
          },
});
