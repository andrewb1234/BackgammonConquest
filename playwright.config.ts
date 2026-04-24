import { defineConfig, devices } from "@playwright/test";

// Use dedicated ports so Playwright webServers never collide with other
// projects running a default Vite (5173) or Node (3001) server locally.
const CLIENT_PORT = Number(process.env.TEST_CLIENT_PORT ?? 5199);
const SERVER_PORT = Number(process.env.TEST_SERVER_PORT ?? 3099);
const CLIENT_URL = process.env.TEST_CLIENT_URL ?? `http://localhost:${CLIENT_PORT}`;
const SERVER_URL = process.env.TEST_SERVER_URL ?? `http://localhost:${SERVER_PORT}`;

export default defineConfig({
  testDir: "./tests/specs",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: CLIENT_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev -w apps/server",
      url: `${SERVER_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ENABLE_TEST_HOOKS: "1",
        CLIENT_URL,
        PORT: String(SERVER_PORT),
      },
    },
    {
      command: `npm run dev -w apps/client -- --port ${CLIENT_PORT} --strictPort`,
      url: CLIENT_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        VITE_SOCKET_URL: SERVER_URL,
      },
    },
  ],
});
