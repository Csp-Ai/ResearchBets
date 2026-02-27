import { describe, expect, it } from 'vitest';

import { buildShareRunHref } from '@/src/core/trace/shareHref';

describe('buildShareRunHref', () => {
  it('returns null without trace id', () => {
    const href = buildShareRunHref({
      toHref: () => '/stress-test?sport=nba'
    });

    expect(href).toBeNull();
  });

  it('builds share href with trace id and spine keys', () => {
    const href = buildShareRunHref({
      sport: 'nba',
      date: '2026-02-27',
      tz: 'America/New_York',
      mode: 'demo',
      toHref: () => '/stress-test?sport=nba&date=2026-02-27&tz=America%2FNew_York&mode=demo'
    }, 'trace-123');

    expect(href).toContain('trace_id=trace-123');
    expect(href).toContain('sport=nba');
    expect(href).toContain('date=2026-02-27');
    expect(href).toContain('tz=America%2FNew_York');
    expect(href).toContain('mode=demo');
    expect(href).toContain('tab=analyze');
  });
});
