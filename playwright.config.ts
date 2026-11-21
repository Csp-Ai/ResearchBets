import { defineConfig } from '@playwright/test';

const remoteUrl = process.env.JOURNEY_BASE_URL;
const baseURL = remoteUrl ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  testMatch: /journey\.spec\.ts/,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: {
    baseURL
  },
  reporter: [['json', { outputFile: 'docs/JOURNEY_REPORT.json' }]],
  webServer: remoteUrl ? undefined : {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000
  }
});
