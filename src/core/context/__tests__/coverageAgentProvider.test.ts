import { describe, expect, it } from 'vitest';

import { createCoverageAgentProvider } from '@/src/core/context/coverageAgentProvider';
import type { TrustedContextBundle } from '@/src/core/context/types';

const trustedBundle: TrustedContextBundle = {
  asOf: '2025-01-01T12:00:00.000Z',
  items: [
    {
      kind: 'injury',
      subject: { sport: 'nba', player: 'Jayson Tatum' },
      headline: 'Jayson Tatum available',
      confidence: 'verified',
      trust: 'verified',
      asOf: '2025-01-01T12:00:00.000Z',
      sources: [{ provider: 'sportsdataio', label: 'SportsDataIO', retrievedAt: '2025-01-01T12:00:00.000Z', trust: 'verified' }]
    }
  ],
  coverage: { injuries: 'live', transactions: 'none', odds: 'none', schedule: 'none' }
};

describe('coverageAgentProvider', () => {
  it('marks non-allowlisted sources as unverified', async () => {
    const provider = createCoverageAgentProvider(async () => ({
      sources: [{ label: 'Blog', url: 'https://randomblog.example.com/post' }],
      items: [{ kind: 'note', headline: 'Travel angle', sourceUrls: ['https://randomblog.example.com/post'] }]
    }));

    const result = await provider.fetchCoverageAgentContext({
      sport: 'nba',
      teams: [{ team: 'Boston Celtics' }],
      players: [],
      legsText: 'Tatum over 29.5',
      trustedBundle
    });

    expect(result.items[0]?.trust).toBe('unverified');
  });

  it('discards injury/status claims without sources', async () => {
    const provider = createCoverageAgentProvider(async () => ({
      items: [{ kind: 'injury', headline: 'Player X is out' }],
      sources: []
    }));

    const result = await provider.fetchCoverageAgentContext({
      sport: 'nba',
      teams: [],
      players: [],
      legsText: 'Player X over 10.5',
      trustedBundle
    });

    expect(result.items).toHaveLength(0);
  });

  it('drops duplicates when a trusted item already exists', async () => {
    const provider = createCoverageAgentProvider(async () => ({
      sources: [{ label: 'NBA', url: 'https://www.nba.com/news' }],
      items: [{ kind: 'injury', headline: 'Jayson Tatum available', subject: { sport: 'nba', player: 'Jayson Tatum' }, sourceUrls: ['https://www.nba.com/news'] }]
    }));

    const result = await provider.fetchCoverageAgentContext({
      sport: 'nba',
      teams: [],
      players: [{ player: 'Jayson Tatum' }],
      legsText: 'Tatum over 29.5',
      trustedBundle
    });

    expect(result.items).toHaveLength(0);
  });
});
