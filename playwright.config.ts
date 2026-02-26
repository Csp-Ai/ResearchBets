import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /journey\.spec\.ts/,
  use: {
    baseURL: 'http://127.0.0.1:3000'
  },
  reporter: [['json', { outputFile: 'docs/JOURNEY_REPORT.json' }]],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120000
  }
});
