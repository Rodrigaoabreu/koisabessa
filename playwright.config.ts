import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: undefined, viewport: { width: 1440, height: 1000 } } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: 'npm run start -w backend', url: 'http://127.0.0.1:3001/health', timeout: 60_000, reuseExistingServer: true },
    { command: 'npm run dev -w frontend', url: 'http://127.0.0.1:5173', timeout: 60_000, reuseExistingServer: true },
  ],
});
