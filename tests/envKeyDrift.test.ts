import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';

const ROOT = process.cwd();
const SCAN_ROOTS = ['app/api', 'src/core', 'lib/config'];
const ALLOWED_RAW_STRING_FILES = new Set([
  'src/core/env/keys.ts',
  'tests/envKeyDrift.test.ts',
]);

const canonicalValues = Object.values(CANONICAL_KEYS);
const aliasValues = Object.values(ALIAS_KEYS).flat();
const trackedKeys = [...canonicalValues, ...aliasValues];

const listFiles = (root: string): string[] => {
  const fullRoot = path.join(ROOT, root);
  if (!statSync(fullRoot).isDirectory()) return [];

  const files: string[] = [];
  const queue = [fullRoot];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(next);
        continue;
      }
      if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        files.push(path.relative(ROOT, next));
      }
    }
  }
  return files;
};

describe('env key drift guard', () => {
  const files = SCAN_ROOTS.flatMap(listFiles);

  it('does not use direct process.env.KEY access for tracked keys outside env helper files and tests', () => {
    const offenders: string[] = [];

    for (const file of files) {
      if (file.includes('__tests__') || file.includes('/tests/')) continue;
      if (file.startsWith('tests/')) continue;
      if (file.startsWith('src/core/env/')) continue;

      const source = readFileSync(path.join(ROOT, file), 'utf8');
      for (const key of trackedKeys) {
        const dotPattern = new RegExp(`process\\.env\\.${key}\\b`);
        if (dotPattern.test(source)) {
          offenders.push(`${file}: process.env.${key}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('does not hardcode tracked env key strings outside allowlist', () => {
    const offenders: string[] = [];

    for (const file of files) {
      if (ALLOWED_RAW_STRING_FILES.has(file)) continue;
      if (file.includes('__tests__') || file.includes('/tests/')) continue;
      if (file.startsWith('tests/')) continue;

      const source = readFileSync(path.join(ROOT, file), 'utf8');
      for (const key of trackedKeys) {
        const rawStringPattern = new RegExp(`['\"]${key}['\"]`);
        if (rawStringPattern.test(source)) {
          offenders.push(`${file}: "${key}"`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
