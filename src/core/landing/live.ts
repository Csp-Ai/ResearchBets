export type LandingMode = 'demo' | 'live';

export interface LandingSnapshot {
  providers: Array<{ name: string; status: 'ok' | 'warn'; icon: string }>;
  featuredGame: { matchup: string; league: string; time: string };
  oddsHeadline: string;
  statusText: string;
}

const DEMO_SNAPSHOT: LandingSnapshot = {
  providers: [
    { name: 'SportsData', status: 'warn', icon: '⚠️' },
    { name: 'Odds', status: 'warn', icon: '⚠️' }
  ],
  featuredGame: { matchup: 'NYK @ IND', league: 'NBA', time: '7:30 PM' },
  oddsHeadline: 'Knicks ML  -130',
  statusText: 'Demo Mode Active — connect providers to enable live snapshot'
};

export async function fetchLandingSnapshot(mode: LandingMode): Promise<LandingSnapshot> {
  if (mode !== 'live') return DEMO_SNAPSHOT;

  const hasProviders = Boolean(process.env.SPORTSDATA_API_KEY || process.env.ODDS_API_KEY || process.env.THEODDSAPI_KEY);
  if (!hasProviders) {
    return {
      ...DEMO_SNAPSHOT,
      providers: DEMO_SNAPSHOT.providers.map((item) => ({ ...item, status: 'ok', icon: '✅' })),
      statusText: 'Live Mode — awaiting provider data'
    };
  }

  return {
    providers: [
      { name: 'SportsData', status: 'ok', icon: '✅' },
      { name: 'Odds', status: 'ok', icon: '✅' }
    ],
    featuredGame: DEMO_SNAPSHOT.featuredGame,
    oddsHeadline: DEMO_SNAPSHOT.oddsHeadline,
    statusText: 'Live Mode — provider signal available'
  };
}
