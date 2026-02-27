import { describe, expect, it } from 'vitest';

import { createDemoTodayPayload } from '@/src/core/today/demoToday';

import { buildSlateSummary } from '../slateEngine';

describe('buildSlateSummary', () => {
  it('returns deterministic output for same payload', () => {
    const payload = createDemoTodayPayload();
    const first = buildSlateSummary(payload);
    const second = buildSlateSummary(payload);

    expect(first).toEqual(second);
    expect(first.narrative.split('. ').length).toBeGreaterThanOrEqual(2);
    expect(first.prepConfidence).toBeGreaterThanOrEqual(0);
    expect(first.prepConfidence).toBeLessThanOrEqual(100);
  });
});
