import 'server-only';

import { DEMO_GAMES, type BettorGame } from './demoData';

export type BettorDataEnvelope = {
  mode: 'live' | 'demo';
  games: BettorGame[];
  providerStatus: {
    stats: 'connected' | 'missing';
    odds: 'connected' | 'missing';
    injuries: 'connected' | 'missing';
  };
};

const readProviderStatus = () => ({
  stats: process.env.SPORTSDATAIO_API_KEY ? 'connected' : 'missing',
  odds: process.env.ODDS_API_KEY ? 'connected' : 'missing',
  injuries: process.env.SPORTSDATAIO_API_KEY ? 'connected' : 'missing'
} as const);

export const getBettorData = async (): Promise<BettorDataEnvelope> => {
  const providerStatus = readProviderStatus();
  const hasLive = Object.values(providerStatus).every((state) => state === 'connected');

  return {
    mode: hasLive ? 'live' : 'demo',
    games: DEMO_GAMES,
    providerStatus
  };
};
