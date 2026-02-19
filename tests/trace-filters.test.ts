import { describe, expect, it } from 'vitest';

import { hasActiveTraceFilters } from '../src/components/terminal/traceFilters';

describe('hasActiveTraceFilters', () => {
  it('returns true when at least one filter is active', () => {
    expect(hasActiveTraceFilters('all', 'all', true)).toBe(true);
    expect(hasActiveTraceFilters('agent_error', 'all', false)).toBe(true);
    expect(hasActiveTraceFilters('all', 'alpha', false)).toBe(true);
  });

  it('returns false when no filters are active', () => {
    expect(hasActiveTraceFilters('all', 'all', false)).toBe(false);
  });
});
