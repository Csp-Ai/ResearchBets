import { describe, expect, it } from 'vitest';

import { selectTimelineEvents } from '../src/components/TerminalLoopShell';

describe('terminal loop timeline data source', () => {
  it('uses live endpoint events when available', () => {
    const live = [{ event_name: 'slip_submitted', timestamp: new Date().toISOString() }];
    const selected = selectTimelineEvents(live);
    expect(selected.usingDemo).toBe(false);
    expect(selected.rows[0]?.event_name).toBe('slip_submitted');
  });

  it('falls back to labeled demo data only when empty', () => {
    const selected = selectTimelineEvents([]);
    expect(selected.usingDemo).toBe(true);
    expect(selected.rows.length).toBeGreaterThan(0);
  });
});
