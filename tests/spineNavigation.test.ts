import { describe, expect, it, vi } from 'vitest';

import { spineApiUrl, spineHref } from '@/src/core/nervous/spineNavigation';

const baseSpine = {
  sport: 'nba',
  tz: 'America/New_York',
  date: '2026-02-27',
  mode: 'demo' as const,
  trace_id: 'trace-123'
};

describe('spine navigation primitives', () => {
  it('builds normalized hrefs while preserving spine continuity', () => {
    const href = spineHref('/research', baseSpine, { tab: 'live', source: 'cockpit' });
    const parsed = new URL(`https://example.com${href}`);

    expect(parsed.searchParams.get('sport')).toBe('NBA');
    expect(parsed.searchParams.get('trace_id')).toBe('trace-123');
    expect(parsed.searchParams.get('tab')).toBe('live');
    expect(parsed.searchParams.get('source')).toBe('cockpit');
  });

  it('keeps active location spine params on client', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?sport=NFL&tz=America/Chicago&date=2026-03-01&mode=live&trace_id=trace-live'
      }
    });

    const href = spineApiUrl('/api/today', undefined, { refresh: 1 });
    const parsed = new URL(`https://example.com${href}`);

    expect(parsed.searchParams.get('sport')).toBe('NFL');
    expect(parsed.searchParams.get('mode')).toBe('live');
    expect(parsed.searchParams.get('trace_id')).toBe('trace-live');
    expect(parsed.searchParams.get('refresh')).toBe('1');

    vi.unstubAllGlobals();
  });
});
