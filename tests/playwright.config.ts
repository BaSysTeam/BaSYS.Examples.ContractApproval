import { defineConfig, devices } from '@playwright/test';
import { baseURL, storageStatePath } from './src/config';

/**
 * Конфигурация Playwright для e2e-тестов примера ContractApproval.
 * Документация: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    // Локальный стенд использует самоподписанный HTTPS-сертификат.
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      // Проект авторизации: логинится и сохраняет состояние сессии в .auth/state.json.
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Переиспользуем сохранённую сессию, чтобы не логиниться в каждом тесте.
        storageState: storageStatePath,
      },
      dependencies: ['setup'],
    },
  ],
});
