import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': path.resolve(__dirname, 'tests/setup/serverOnlyMock.ts')
    }
  },
  test: {
    setupFiles: ['tests/setup/serverOnlyShim.ts']
  }
});
