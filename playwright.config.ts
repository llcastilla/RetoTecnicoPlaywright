import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 120000, // 2 minutos por test
  fullyParallel: false,
  forbidOnly: !! process.env.CI,
  retries: 1, // un reintento por defecto
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/htmlReport', open: 'never' }],
  ],

  use: {
    headless: false,
    baseURL: 'https://www.floristeriamundoflor.com/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});