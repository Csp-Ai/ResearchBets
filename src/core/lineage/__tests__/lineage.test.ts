import { describe, expect, it } from 'vitest';

import { normalizeLineage, withTrace } from '@/src/core/lineage/lineage';

describe('normalizeLineage', () => {
  it('forces run_id to equal trace_id', () => {
    const lineage = normalizeLineage({ trace_id: 'trace-123', run_id: 'run-mismatch' });
    expect(lineage.run_id).toBe('trace-123');
    expect(lineage.trace_id).toBe('trace-123');
  });

  it('keeps optional fields', () => {
    const lineage = withTrace({ ticketId: 'ticket-1', slip_id: 'slip-1', mode: 'demo' }, 'trace-5');
    expect(lineage).toMatchObject({
      trace_id: 'trace-5',
      run_id: 'trace-5',
      ticketId: 'ticket-1',
      slip_id: 'slip-1',
      mode: 'demo',
    });
  });
});
