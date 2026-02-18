import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const walk = (dir: string): string[] => {
  const entries = readdirSync(dir);

  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return walk(fullPath);
    }

    return fullPath;
  });
};

describe('runtime enforcement', () => {
  it('only runtime files call .handler(', () => {
    const files = walk(join(process.cwd(), 'src'))
      .filter((filePath) => filePath.endsWith('.ts'))
      .filter((filePath) => !filePath.endsWith('.test.ts'));

    const offenders = files.filter((filePath) => {
      if (filePath.endsWith('src/core/agent-runtime/executeAgent.ts')) {
        return false;
      }

      const contents = readFileSync(filePath, 'utf-8');
      return /\.handler\(/.test(contents);
    });

    expect(offenders).toEqual([]);
  });
});
