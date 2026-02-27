import { describe, expect, it } from 'vitest';

import { appendQuery } from '@/src/components/landing/navigation';
import { toHref } from '@/src/core/nervous/routes';
import type { QuerySpine } from '@/src/core/nervous/spine';

describe('spine links continuity', () => {
  const spine: QuerySpine = {
    sport: 'NBA',
    tz: 'America/New_York',
    date: '2026-02-27',
    mode: 'demo',
    trace_id: 'trace-abc'
  };

  it('preserves canonical spine keys when appending query params', () => {
    const href = appendQuery(toHref('/stress-test', spine), { tab: 'analyze' });
    const url = new URL(`https://example.com${href}`);

    expect(url.searchParams.get('sport')).toBe(spine.sport);
    expect(url.searchParams.get('tz')).toBe(spine.tz);
    expect(url.searchParams.get('date')).toBe(spine.date);
    expect(url.searchParams.get('mode')).toBe(spine.mode);
    expect(url.searchParams.get('trace_id')).toBe(spine.trace_id);
    expect(url.searchParams.get('tab')).toBe('analyze');
  });

  it('keeps spine keys across overrides', () => {
    const href = toHref('/today', spine, { mode: 'live', sport: 'NFL' });
    const url = new URL(`https://example.com${href}`);

    expect(url.searchParams.get('sport')).toBe('NFL');
    expect(url.searchParams.get('mode')).toBe('live');
    expect(url.searchParams.get('tz')).toBe(spine.tz);
    expect(url.searchParams.get('date')).toBe(spine.date);
    expect(url.searchParams.get('trace_id')).toBe(spine.trace_id);
  });
});
