import { asMarketType, type MarketType } from '@/src/core/markets/marketType';

import type { NormalizedToday } from './normalize';

type SpineSeed = {
  sport?: string;
  tz?: string;
  date?: string;
  mode?: string;
};

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};

const pickOdds = (seed: number) => {
  const options = ['-125', '-118', '-110', '-105', '+100', '+108'];
  return options[seed % options.length] ?? '-110';
};

const pickMarket = (seed: number): MarketType => {
  const options: MarketType[] = ['points', 'assists', 'rebounds', 'pra', 'threes'];
  return options[seed % options.length] ?? 'points';
};

export const fallbackToday = (spine?: SpineSeed): NormalizedToday => {
  const sport = (spine?.sport ?? 'NBA').toUpperCase();
  const date = spine?.date ?? '2026-01-15';
  const base = hashSeed(`${sport}:${date}:${spine?.tz ?? 'America/Phoenix'}`);

  const games = [
    { id: `${sport.toLowerCase()}-g1`, matchup: `${sport} Alpha @ ${sport} Nova`, startTime: '7:10 PM' },
    { id: `${sport.toLowerCase()}-g2`, matchup: `${sport} Orbit @ ${sport} Pulse`, startTime: '8:40 PM' },
    { id: `${sport.toLowerCase()}-g3`, matchup: `${sport} Comets @ ${sport} Harbor`, startTime: '10:05 PM' }
  ];

  const players = ['J. Carter', 'M. Daniels', 'R. Young', 'A. Lewis', 'D. Martin', 'T. Brooks'];

  const board = players.map((player, index) => {
    const seed = base + index * 17;
    const market = pickMarket(seed);
    const line = `${(seed % 8) + 2}.5`;
    const hitRateL10 = 52 + (seed % 23);
    const game = games[index % games.length] || games[0] || { id: 'fallback-game', matchup: 'TBD @ TBD', startTime: 'TBD' };

    return {
      id: `${game.id}-p${index + 1}`,
      player,
      market: asMarketType(market, 'points'),
      line,
      odds: pickOdds(seed),
      hitRateL10,
      riskTag: hitRateL10 >= 60 ? 'stable' as const : 'watch' as const,
      gameId: game.id
    };
  });

  return {
    mode: spine?.mode === 'live' ? 'live' : 'demo',
    reason: 'deterministic_fallback',
    games,
    board
  };
};
