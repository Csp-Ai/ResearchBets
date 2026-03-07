import { describe, expect, it } from 'vitest';

import { getQueryTraceId, withTraceId } from '@/src/core/trace/queryTrace';

describe('queryTrace helpers', () => {
  it('prefers trace_id over legacy trace query key', () => {
    const params = new URLSearchParams('trace=legacy-id&trace_id=canonical-id');
    expect(getQueryTraceId(params)).toBe('canonical-id');
  });


  it('falls back to legacy traceId key before trace', () => {
    const params = new URLSearchParams('traceId=legacy-camel&trace=legacy-short');
    expect(getQueryTraceId(params)).toBe('legacy-camel');
  });

  it('falls back to trace and appends canonical trace_id', () => {
    const params = new URLSearchParams('trace=legacy-id');
    expect(getQueryTraceId(params)).toBe('legacy-id');
    expect(withTraceId('/research?tab=analyze', 't-123')).toBe('/research?tab=analyze&trace_id=t-123');
  });
});
