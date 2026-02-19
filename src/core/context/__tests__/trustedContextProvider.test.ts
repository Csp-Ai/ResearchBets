import { describe, expect, it, vi } from 'vitest';

import { createTrustedContextProvider } from '@/src/core/context/trustedContextProvider';

const fixedClock = { now: () => new Date('2025-01-01T12:00:00.000Z') };

describe('trustedContextProvider', () => {
  it('batches unique teams/players in provider calls', async () => {
    const fetchInjuries = vi.fn(async () => ({ asOf: '2025-01-01T12:00:00.000Z', items: [], sources: [] }));
    const provider = createTrustedContextProvider({ injuries: { fetchInjuries } }, fixedClock);

    await provider.fetchTrustedContext({
      sport: 'nba',
      teams: [{ teamId: 'A' }, { teamId: 'A' }, { teamId: 'B' }],
      players: [{ playerId: 'P1' }, { playerId: 'P1' }, { playerId: 'P2' }],
      eventIds: []
    });

    expect(fetchInjuries).toHaveBeenCalledTimes(1);
    expect(fetchInjuries).toHaveBeenCalledWith(expect.objectContaining({ teamIds: ['A', 'B'], playerIds: ['P1', 'P2'] }));
  });

  it('returns fallback reason and zero items when trusted data is empty', async () => {
    const provider = createTrustedContextProvider({}, fixedClock);
    const bundle = await provider.fetchTrustedContext({ sport: 'nba', teams: [], players: [], eventIds: [] });

    expect(bundle.items).toHaveLength(0);
    expect(bundle.fallbackReason).toBe('No verified update from trusted sources.');
  });

  it('does not fabricate injury headlines when provider returns no injuries', async () => {
    const provider = createTrustedContextProvider({
      injuries: {
        fetchInjuries: async () => ({ asOf: '2025-01-01T12:00:00.000Z', items: [], sources: [], fallbackReason: 'no_data' })
      }
    }, fixedClock);

    const bundle = await provider.fetchTrustedContext({ sport: 'nba', teams: [{ team: 'Boston' }], players: [], eventIds: [] });
    expect(bundle.items.filter((item) => item.kind === 'injury' || item.kind === 'suspension')).toHaveLength(0);
  });
});
