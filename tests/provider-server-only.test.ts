import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === '.next') continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
};

describe('provider security boundaries', () => {
  it('provider modules are server-only and client modules do not import them', () => {
    const sports = readFileSync(path.join(repoRoot, 'src/core/providers/sportsdataio.ts'), 'utf8');
    const odds = readFileSync(path.join(repoRoot, 'src/core/providers/theoddsapi.ts'), 'utf8');
    expect(sports).toContain("import 'server-only';");
    expect(odds).toContain("import 'server-only';");
    expect(sports).not.toMatch(/NEXT_PUBLIC_(SPORTSDATAIO|ODDS)_/);
    expect(odds).not.toMatch(/NEXT_PUBLIC_(SPORTSDATAIO|ODDS)_/);

    const allFiles = walk(path.join(repoRoot, 'src'));
    for (const file of allFiles) {
      const text = readFileSync(file, 'utf8');
      if (!text.includes("'use client'") && !text.includes('"use client"')) continue;
      expect(text).not.toMatch(/from ['\"][^'\"]*core\/providers\//);
    }
  });
});
