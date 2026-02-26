import type { MarketType } from '@/src/core/markets/marketType';

export const TODAY_LEAGUES = ['NBA', 'NFL', 'MLB', 'Soccer', 'UFC', 'NHL'] as const;
export type TodayLeague = (typeof TODAY_LEAGUES)[number];

export type TodayMode = 'live' | 'cache' | 'demo';

export type TodayPropKey = {
  id: string;
  player: string;
  market: MarketType;
  line?: string;
  odds?: string;
  rationale: string[];
  provenance: string;
  lastUpdated: string;
};

export type TodayGame = {
  id: string;
  league: TodayLeague;
  status: 'live' | 'upcoming';
  startTime: string;
  matchup: string;
  teams: string[];
  bookContext: string;
  propsPreview: TodayPropKey[];
  provenance: string;
  lastUpdated: string;
};

export type TodayPayload = {
  mode: TodayMode;
  generatedAt: string;
  leagues: TodayLeague[];
  games: TodayGame[];
  reason?: string;
  modeFallbackApplied?: boolean;
  providerErrors?: string[];
  userSafeReason?: string;
  landing?: {
    mode: 'live' | 'demo';
    reason: 'live_ok' | 'demo_requested' | 'live_mode_disabled' | 'missing_keys' | 'provider_unavailable';
    gamesCount: number;
    lastUpdatedAt: string;
    headlineMatchup?: string;
  };
};
