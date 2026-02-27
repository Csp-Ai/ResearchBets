import path from 'node:path';

import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': path.resolve(__dirname, 'tests/setup/serverOnlyMock.ts')
    }
  },
  esbuild: {
    jsx: 'automatic'
  },
  test: {
    setupFiles: ['tests/setup/serverOnlyShim.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'app/**/*.test.ts', 'app/**/*.test.tsx'],
    exclude: [...configDefaults.exclude, 'tests/journey.spec.ts']
  }
});
