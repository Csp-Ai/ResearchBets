import type { MarketType } from '@/src/core/markets/marketType';

export const TODAY_LEAGUES = ['NBA', 'NFL', 'MLB', 'Soccer', 'UFC', 'NHL'] as const;
export type TodayLeague = (typeof TODAY_LEAGUES)[number];

export type TodayMode = 'live' | 'cache' | 'demo';

export type TodayModeEnvelope = {
  mode: TodayMode;
  reason?: string;
};

export type TodayIntent = {
  mode: TodayMode;
  sport?: string;
  tz?: string;
  date?: string;
};

export type TodayLiveStep =
  | 'resolve_context'
  | 'events_fetch'
  | 'odds_fetch'
  | 'stats_fetch'
  | 'normalize'
  | 'board_build'
  | 'min_row_checks'
  | 'live_viability';

export type ProviderHealth = {
  provider: string;
  ok: boolean;
  message?: string;
  missingKey?: boolean;
};


export type TodayProvenance = {
  mode: TodayMode;
  reason?: string;
  generatedAt: string;
};

export type BoardRow = {
  id: string;
  gameId: string;
  player: string;
  market: MarketType;
  line: string;
  odds: string;
  startTime?: string;
  matchup?: string;
  hitRateL10: number;
  hitRateL5?: number;
  marketImpliedProb: number;
  modelProb: number;
  edgeDelta: number;
  riskTag: 'stable' | 'watch';
  confidencePct?: number;
  book_source?: string;
  line_variance?: number;
  book_count?: number;
  source?: string;
  degraded?: boolean;
  mode?: TodayMode;
  minutesL1?: number;
  minutesL3Avg?: number;
  l5Avg?: number;
  l10Avg?: number;
  threesAttL1?: number;
  threesAttL3Avg?: number;
  threesAttL5Avg?: number;
  fgaL1?: number;
  fgaL3Avg?: number;
  fgaL5Avg?: number;
  l5Source?: 'live'|'cached'|'demo'|'heuristic';
  minutesSource?: 'live'|'cached'|'demo'|'heuristic';
  attemptsSource?: 'live'|'cached'|'demo'|'heuristic';
  roleConfidence?: 'high'|'med'|'low';
  roleReasons?: string[];
  deadLegRisk?: 'low'|'med'|'high';
  deadLegReasons?: string[];
};

export type TodayPropKey = {
  id: string;
  player: string;
  market: MarketType;
  line?: string;
  odds?: string;
  hitRateL10?: number;
  hitRateL5?: number;
  marketImpliedProb?: number;
  modelProb?: number;
  edgeDelta?: number;
  riskTag?: 'stable' | 'watch';
  confidencePct?: number;
  book_source?: string;
  line_variance?: number;
  book_count?: number;
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

export type TodayBoardRow = {
  id: string;
  gameId: string;
  player: string;
  market: MarketType;
  line?: string;
  odds?: string;
  hitRateL10?: number;
  hitRateL5?: number;
  marketImpliedProb?: number;
  modelProb?: number;
  edgeDelta?: number;
  riskTag?: 'stable' | 'watch';
  confidencePct?: number;
  rationale?: string[];
  provenance?: string;
  lastUpdated?: string;
  matchup?: string;
  startTime?: string;
  mode?: TodayMode;
  minutesL1?: number;
  minutesL3Avg?: number;
  l5Avg?: number;
  l10Avg?: number;
  threesAttL1?: number;
  threesAttL3Avg?: number;
  threesAttL5Avg?: number;
  fgaL1?: number;
  fgaL3Avg?: number;
  fgaL5Avg?: number;
  l5Source?: 'live'|'cached'|'demo'|'heuristic';
  minutesSource?: 'live'|'cached'|'demo'|'heuristic';
  attemptsSource?: 'live'|'cached'|'demo'|'heuristic';
  roleConfidence?: 'high'|'med'|'low';
  roleReasons?: string[];
  deadLegRisk?: 'low'|'med'|'high';
  deadLegReasons?: string[];
};

export type TodayPayload = {
  mode: TodayMode;
  intent?: TodayIntent;
  effective?: TodayModeEnvelope;
  generatedAt: string;
  provenance?: TodayProvenance;
  leagues: TodayLeague[];
  games: TodayGame[];
  board?: TodayBoardRow[];
  reason?: string;
  modeFallbackApplied?: boolean;
  providerErrors?: string[];
  providerWarnings?: string[];
  debug?: {
    step: string;
    statusCode?: number;
    hint: string;
  };
  userSafeReason?: string;
  status?: 'active' | 'next' | 'market_closed';
  nextAvailableStartTime?: string;
  providerHealth?: ProviderHealth[];
  landing?: {
    mode: TodayMode;
    reason: 'live_ok' | 'missing_keys' | 'provider_unavailable' | 'demo';
    gamesCount: number;
    lastUpdatedAt: string;
    headlineMatchup?: string;
  };
};
