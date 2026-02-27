import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getModePresentation } from '@/src/core/mode';
import { resolveToday } from '@/src/core/today/resolveToday.server';

const root = process.cwd();

describe('v0.6.1 sprint-1 invariants', () => {
  it('resolver returns a non-empty demo board', async () => {
    const payload = await resolveToday({ mode: 'demo', sport: 'NBA', date: '2026-01-15', tz: 'America/Phoenix' });
    expect(payload.mode).toBe('demo');
    expect((payload.board ?? []).length).toBeGreaterThan(0);
  });

  it('/api/today imports canonical resolver entrypoint', () => {
    const routeSource = readFileSync(path.join(root, 'app/api/today/route.ts'), 'utf8');
    expect(routeSource).toContain("from '@/src/core/today/resolveToday.server'");
    expect(routeSource).toContain('resolveToday(');
  });

  it('home and today surfaces use the shared board model builder', () => {
    const homeSource = readFileSync(path.join(root, 'src/components/landing/FrontdoorLandingClient.tsx'), 'utf8');
    const todaySource = readFileSync(path.join(root, 'src/components/today/TodayPageClient.tsx'), 'utf8');

    expect(homeSource).toContain("from '@/src/core/today/boardModel'");
    expect(homeSource).toContain('buildCanonicalBoard(');

    expect(todaySource).toContain("from '@/src/core/today/boardModel'");
    expect(todaySource).toContain('buildCanonicalBoard(');
  });

  it('mode labels are neutral and demo copy avoids failure language', () => {
    const demo = getModePresentation('demo');
    const cache = getModePresentation('cache');

    expect(demo.label).toBe('Demo mode (live feeds off)');
    expect(cache.label).toBe('Cache');
    expect(demo.label.toLowerCase()).not.toContain('failed');
    expect(demo.tooltip.toLowerCase()).not.toContain('failed');
  });
});
