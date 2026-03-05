import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

const listFiles = (command: string): string[] => execSync(command, { encoding: 'utf8' }).split('\n').map((line) => line.trim()).filter(Boolean);

const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

const hasUseClientDirective = (source: string): boolean => {
  const trimmed = source.trimStart();
  return trimmed.startsWith("'use client'") || trimmed.startsWith('"use client"');
};

const importViolations = (filePath: string, source: string): string[] => {
  const violations: string[] = [];
  if (/from\s+['\"][^'\"]*core\/providers\/registry\.server['\"]/.test(source)) {
    violations.push(`${filePath} imports registry.server.ts`);
  }
  if (/from\s+['\"][^'\"]*core\/providers\/registry['\"]/.test(source)) {
    violations.push(`${filePath} imports legacy registry.ts path`);
  }
  return violations;
};

describe('provider registry client import guards', () => {
  it('blocks server registry imports in src/components', () => {
    const files = listFiles('rg --files src/components');
    const violations = files.flatMap((file) => importViolations(file, read(file)));
    expect(violations).toEqual([]);
  });

  it('blocks server registry imports from use-client app routes', () => {
    const files = listFiles('rg --files app');
    const violations = files.flatMap((file) => {
      const source = read(file);
      if (!hasUseClientDirective(source)) return [];
      return importViolations(file, source);
    });
    expect(violations).toEqual([]);
  });


  it('keeps provider env key reads aligned with LIVE_PROVIDER_KEYS', async () => {
    const { LIVE_PROVIDER_KEYS } = await import('@/src/core/env/runtime.server');
    const allowed = new Set<string>(LIVE_PROVIDER_KEYS);
    const providerFiles = listFiles('rg --files src/core/providers');
    const envKeyPattern = /process\.env\.([A-Z0-9_]+)/g;

    const usedKeys = new Set<string>();
    for (const file of providerFiles) {
      const source = read(file);
      let match = envKeyPattern.exec(source);
      while (match) {
        if (match[1]) usedKeys.add(match[1]);
        match = envKeyPattern.exec(source);
      }
    }

    const providerLiveKeys = [...usedKeys].filter((key) => key.includes('API_KEY'));
    const violations = providerLiveKeys.filter((key) => !allowed.has(key));
    expect(violations).toEqual([]);
  });

  it('ensures no source file imports legacy provider registry path', () => {
    const files = listFiles('rg --files src app');
    const violations = files.flatMap((file) => {
      const source = read(file);
      return /from\s+['\"][^'\"]*core\/providers\/registry['\"]/.test(source)
        ? [`${file} imports legacy registry path`]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
