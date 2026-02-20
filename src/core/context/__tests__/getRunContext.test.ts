import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/core/context/trustedContextProvider.server', () => ({
  fetchTrustedContext: vi.fn(async () => ({
    asOf: '2025-01-01T12:00:00.000Z',
    items: [],
    coverage: { injuries: 'none', transactions: 'none', odds: 'none', schedule: 'none' },
    fallbackReason: 'No verified update from trusted sources.'
  }))
}));

vi.mock('@/src/core/context/coverageAgentProvider', () => ({
  fetchCoverageAgentContext: vi.fn(async () => ({
    asOf: '2025-01-01T12:01:00.000Z',
    items: [
      {
        kind: 'injury',
        subject: { sport: 'nba', player: 'Player A' },
        headline: 'Player A questionable',
        confidence: 'unknown',
        trust: 'unverified',
        asOf: '2025-01-01T12:01:00.000Z',
        sources: [{ provider: 'coverage_agent', label: 'Blog', url: 'https://blog.example.com/a', retrievedAt: '2025-01-01T12:01:00.000Z', trust: 'unverified' }]
      }
    ],
    sources: []
  }))
}));

import { getRunContext } from '@/src/core/context/getRunContext';

describe('getRunContext', () => {
  afterEach(() => {
    delete process.env.ENABLE_COVERAGE_AGENT;
  });

  it('keeps behavior unchanged when coverage agent disabled', async () => {
    process.env.ENABLE_COVERAGE_AGENT = 'false';
    const bundle = await getRunContext({ sport: 'nba', teams: [], players: [], eventIds: [], legsText: 'x' });
    expect(bundle.unverifiedItems).toBeUndefined();
  });

  it('attaches unverified items when coverage agent is enabled', async () => {
    process.env.ENABLE_COVERAGE_AGENT = 'true';
    const bundle = await getRunContext({ sport: 'nba', teams: [], players: [], eventIds: [], legsText: 'x' });
    expect(bundle.unverifiedItems?.length).toBe(1);
    expect(bundle.items).toHaveLength(0);
    expect(bundle.unverifiedItems?.[0]?.trust).toBe('unverified');
  });
});
