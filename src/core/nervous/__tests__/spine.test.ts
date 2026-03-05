import { describe, expect, it } from 'vitest';

import { normalizeSpine, normalizeSpineWithWarnings, parseSpineFromSearch, serializeSpine } from '@/src/core/nervous/spine';

describe('spine normalization', () => {
  it('fills required defaults', () => {
    const spine = normalizeSpine({});
    expect(spine.sport).toBe('NBA');
    expect(spine.tz).toBe('America/Phoenix');
    expect(spine.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(spine.mode).toBe('live');
  });

  it('serializeSpine emits known keys only', () => {
    const params = serializeSpine(normalizeSpine({ sport: 'NFL', traceId: 'trace-12345678', tab: 'board' }));
    expect(Object.keys(params).sort()).toEqual(['date', 'mode', 'sport', 'tab', 'trace_id', 'tz'].sort());
  });



  it('coerces ET alias to America/New_York with warning', () => {
    const result = normalizeSpineWithWarnings({ tz: 'ET' });
    expect(result.spine.tz).toBe('America/New_York');
    expect(result.warnings).toContain('tz_invalid:ET->America/New_York');
  });

  it('accepts IANA timezone without warning', () => {
    const result = normalizeSpineWithWarnings({ tz: 'America/Phoenix' });
    expect(result.spine.tz).toBe('America/Phoenix');
    expect(result.warnings).toEqual([]);
  });

  it('defaults invalid timezone without throwing', () => {
    const result = normalizeSpineWithWarnings({ tz: 'garbage' });
    expect(result.spine.tz).toBe('America/Phoenix');
    expect(result.warnings).toContain('tz_invalid:garbage->America/Phoenix');
  });

  it('parse + normalize roundtrip is stable', () => {
    const parsed = parseSpineFromSearch(new URLSearchParams('sport=MLB&tz=UTC&date=2026-02-01&mode=demo&trace_id=trace-abcdef12&tab=analyze'));
    const normalized = normalizeSpine(parsed);
    const roundtrip = normalizeSpine(serializeSpine(normalized));
    expect(roundtrip).toEqual(normalized);
  });
});
