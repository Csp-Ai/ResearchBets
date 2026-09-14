import { describe, expect, it } from 'vitest';

import { lineageFromSpine, matchesLifecycleIdentity } from '@/src/core/lineage/lineage';
import { toHref } from '@/src/core/nervous/routes';
import { normalizeSpine, parseSpineFromSearch } from '@/src/core/nervous/spine';

describe('canonical ticket continuity', () => {
  it('preserves identity and provenance through every canonical route', () => {
    let spine = normalizeSpine({ ticketId: 'ticket-1', slip_id: 'slip-1', trace_id: 'trace-1', mode: 'cache' });
    for (const route of ['/', '/stress-test', '/pulse', '/review']) {
      const url = new URL(toHref(route, spine), 'https://example.test');
      spine = normalizeSpine(parseSpineFromSearch(url.searchParams));
      expect(spine).toMatchObject({ ticketId: 'ticket-1', slip_id: 'slip-1', trace_id: 'trace-1', mode: 'cache' });
    }
    expect(lineageFromSpine(spine, 'trace-1')).toMatchObject({ ticketId: 'ticket-1', slip_id: 'slip-1', run_id: 'trace-1' });
  });

  it('normalizes the legacy ticket alias at the boundary', () => {
    expect(normalizeSpine(parseSpineFromSearch(new URLSearchParams('ticket_id=legacy'))).ticketId).toBe('legacy');
  });

  it('does not substitute another ticket sharing the requested trace', () => {
    expect(matchesLifecycleIdentity({ ticketId: 'other', trace_id: 'trace-1' }, { ticketId: 'missing', trace_id: 'trace-1' })).toBe(false);
  });

  it('prefers slip identity over shared trace context', () => {
    expect(matchesLifecycleIdentity({ slip_id: 'other', trace_id: 'trace-1' }, { slip_id: 'slip-1', trace_id: 'trace-1' })).toBe(false);
  });

  it('supports trace-only legacy records and unfiltered history', () => {
    expect(matchesLifecycleIdentity({ trace_id: 'trace-1' }, { trace_id: 'trace-1' })).toBe(true);
    expect(matchesLifecycleIdentity({ ticketId: 'any' }, {})).toBe(true);
  });
});
