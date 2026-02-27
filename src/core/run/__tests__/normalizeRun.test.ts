import { describe, expect, it } from 'vitest';

import { normalizeRun } from '@/src/core/run/normalizeRun';

describe('normalizeRun', () => {
  it('hydrates canonical trace_id from legacy traceId and is idempotent', () => {
    const input = normalizeRun({ traceId: 'legacy-trace' });
    expect(input.trace_id).toBe('legacy-trace');
    expect(input.traceId).toBe('legacy-trace');

    const second = normalizeRun(input);
    expect(second.trace_id).toBe('legacy-trace');
    expect(second.traceId).toBe('legacy-trace');
  });
});
