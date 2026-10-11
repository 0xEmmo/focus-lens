import { defineConfig, devices } from '@playwright/test'

const port = 4176

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'phone',
      testIgnore: /extension\.spec/,
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, browserName: 'chromium' },
    },
    {
      name: 'desktop',
      testIgnore: /extension\.spec/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] },
    },
    {
      // Loads the unpacked extension into Chromium; see e2e/extension.spec.ts.
      name: 'extension',
      testMatch: /extension\.spec/,
      use: { viewport: { width: 1280, height: 860 } },
    },
  ],
  webServer: {
    // The e2e extension build adds host access so tests needn't click the toolbar icon.
    command: `npm run build:ext:e2e && tsx scripts/pack-extension.ts && vite build && vite preview --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
