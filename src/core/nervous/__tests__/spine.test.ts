import { describe, expect, it } from 'vitest';

import { normalizeSpine, parseSpineFromSearch, serializeSpine } from '@/src/core/nervous/spine';

describe('spine normalization', () => {
  it('normalizes legacy trace aliases to trace_id', () => {
    const spine = normalizeSpine({ sport: 'nba', trace: 't-1' });
    expect(spine.sport).toBe('NBA');
    expect(spine.trace_id).toBe('t-1');
  });

  it('parses legacy traceId alias', () => {
    const spine = parseSpineFromSearch('sport=NFL&traceId=abc');
    expect(spine.trace_id).toBe('abc');
    expect(spine.sport).toBe('NFL');
  });

  it('serializes canonical keys only', () => {
    const params = serializeSpine(normalizeSpine({ sport: 'NBA', tz: 'America/Phoenix', date: '2026-01-01', mode: 'live', trace: 'x' }));
    expect(params.get('trace_id')).toBe('x');
    expect(params.get('trace')).toBeNull();
    expect(params.get('traceId')).toBeNull();
  });
});
