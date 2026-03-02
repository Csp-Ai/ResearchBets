/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';

import { listPostmortems, savePostmortem } from '@/src/core/review/store';

describe('review store lineage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists trace_id and normalizes run_id from trace_id', () => {
    savePostmortem({
      ticketId: 'ticket-review-1',
      trace_id: 'trace-review-1',
      run_id: 'run-mismatch',
      createdAt: '2026-02-26T10:00:00.000Z',
      settledAt: '2026-02-26T12:00:00.000Z',
      status: 'lost',
      legs: [],
      coverage: { level: 'full', reasons: [] },
      fragility: { score: 50, chips: [] },
      narrative: ['n1']
    });

    const record = listPostmortems().find((item) => item.ticketId === 'ticket-review-1');
    expect(record?.trace_id).toBe('trace-review-1');
    expect(record?.run_id).toBe('trace-review-1');
  });
});
