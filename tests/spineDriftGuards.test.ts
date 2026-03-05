import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCAN_ROOTS = ['src', 'app'];
const API_APPEND_ALLOWLIST = new Set<string>([
  'src/components/landing/navigation.ts',
  'src/components/_archive/landing/LandingVisionClient.tsx',
  'tests/spineDriftGuards.test.ts'
]);
const INTERNAL_NAV_ALLOWLIST = new Set<string>([
  'app/(product)/dev/dashboard/DevDashboardPageClient.tsx',
  'app/(product)/settings/page.tsx',
  'app/(product)/traces/[trace_id]/TraceDetailPageClient.tsx',
  'tests/spineDriftGuards.test.ts'
]);
const GUARDED_PREFIXES = ['/today', '/slip', '/track', '/cockpit', '/game', '/control', '/research', '/traces'];

const listFiles = (root: string) => {
  const files: string[] = [];
  const queue = [path.join(ROOT, root)];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(next);
      if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(path.relative(ROOT, next));
    }
  }
  return files;
};

const files = SCAN_ROOTS.flatMap(listFiles);

describe('spine drift guards', () => {
  it('blocks appendQuery API usage bypassing spine helpers', () => {
    const offenders: string[] = [];

    for (const file of files) {
      if (API_APPEND_ALLOWLIST.has(file)) continue;
      const source = readFileSync(path.join(ROOT, file), 'utf8');
      if (source.includes("appendQuery('/api") || source.includes('appendQuery("/api')) {
        offenders.push(file);
      }
    }

    expect(offenders, 'Use spineApiUrl()/spineFetch() instead of appendQuery("/api...") for canonical spine continuity.').toEqual([]);
  });

  it('blocks raw internal navigation href strings for spine-sensitive routes', () => {
    const offenders: string[] = [];

    for (const file of files) {
      if (INTERNAL_NAV_ALLOWLIST.has(file)) continue;
      const source = readFileSync(path.join(ROOT, file), 'utf8');
      for (const prefix of GUARDED_PREFIXES) {
        const hasRawLink = source.includes(`<Link href=\"${prefix}`) || source.includes(`<Link href={'${prefix}`) || source.includes(`<Link href=\"${prefix}/`);
        const hasRawRouter = source.includes(`router.push('${prefix}`) || source.includes(`router.push(\"${prefix}`) || source.includes(`window.location.href='${prefix}`) || source.includes(`window.location.href=\"${prefix}`);
        if (hasRawLink || hasRawRouter) {
          offenders.push(`${file}: ${prefix}`);
        }
      }
    }

    expect(offenders, 'Use nervous.toHref(), toHref(), or spineHref() for internal route navigation so trace/mode/sport/tz/date continuity is preserved.').toEqual([]);
  });
});
