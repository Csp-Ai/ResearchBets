import { TODAY_LEAGUES, type TodayPayload } from './types';

const DEMO_GENERATED_AT = '2026-01-15T19:30:00.000Z';

export const DEMO_TODAY_PAYLOAD: TodayPayload = {
  mode: 'demo',
  generatedAt: DEMO_GENERATED_AT,
  leagues: [...TODAY_LEAGUES],
  reason: 'live_unavailable',
  board: [],
  games: [
    {
      id: 'nba-lal-dal-demo',
      league: 'NBA',
      status: 'live',
      startTime: 'Q3 07:12',
      matchup: 'LAL @ DAL',
      teams: ['LAL', 'DAL'],
      bookContext: 'FanDuel-style',
      provenance: 'Internal deterministic slate',
      lastUpdated: '2026-01-15T19:29:00.000Z',
      propsPreview: [
        { id: 'nba1', player: 'Luka Doncic', market: 'assists', line: '8.5', odds: '-118', rationale: ['4/5 over recent sample', 'Top on-ball touch share'], provenance: 'odds-demo + stats-demo', lastUpdated: '2026-01-15T19:29:00.000Z' },
        { id: 'nba2', player: 'LeBron James', market: 'rebounds', line: '7.5', odds: '-110', rationale: ['Minutes stable in close game', 'Opponent long-rebound profile'], provenance: 'odds-demo + matchup model', lastUpdated: '2026-01-15T19:28:30.000Z' },
        { id: 'nba3', player: 'Kyrie Irving', market: 'threes', line: '3.5', odds: '+102', rationale: ['High pull-up volume', 'Defender missing'], provenance: 'odds-demo', lastUpdated: '2026-01-15T19:28:20.000Z' },
        { id: 'nba4', player: 'Anthony Davis', market: 'pra', line: '39.5', odds: '-104', rationale: ['Pace-up script', 'Paint touch advantage'], provenance: 'stats-demo', lastUpdated: '2026-01-15T19:28:00.000Z' }
      ]
    },
    {
      id: 'nfl-kc-buf-demo',
      league: 'NFL',
      status: 'upcoming',
      startTime: '8:20 PM ET',
      matchup: 'KC @ BUF',
      teams: ['KC', 'BUF'],
      bookContext: 'PrizePicks-style',
      provenance: 'Internal deterministic slate',
      lastUpdated: '2026-01-15T19:25:00.000Z',
      propsPreview: [
        { id: 'nfl1', player: 'Josh Allen', market: 'points', line: '1.5 TD', rationale: ['Red-zone rush share', 'Top implied team total'], provenance: 'news + model prior', lastUpdated: '2026-01-15T19:24:00.000Z' },
        { id: 'nfl2', player: 'Patrick Mahomes', market: 'assists', line: '282.5 yds', rationale: ['Blitz rate mismatch', 'Coverage shell tends to concede underneath'], provenance: 'stats-demo', lastUpdated: '2026-01-15T19:24:00.000Z' },
        { id: 'nfl3', player: 'James Cook', market: 'ra', line: '87.5', rationale: ['Route+rush blend elevated', 'Neutral script projection'], provenance: 'projection snapshot', lastUpdated: '2026-01-15T19:23:30.000Z' },
        { id: 'nfl4', player: 'Travis Kelce', market: 'rebounds', line: '63.5 rec yds', rationale: ['Slot seam target concentration', 'Recent first-read trend up'], provenance: 'target-tree model', lastUpdated: '2026-01-15T19:23:00.000Z' }
      ]
    },
    {
      id: 'mlb-lad-atl-demo', league: 'MLB', status: 'upcoming', startTime: '7:10 PM ET', matchup: 'LAD @ ATL', teams: ['LAD', 'ATL'], bookContext: 'FanDuel-style', provenance: 'Internal deterministic slate', lastUpdated: '2026-01-15T19:20:00.000Z',
      propsPreview: [
        { id: 'mlb1', player: 'Mookie Betts', market: 'points', line: '1.5 hits+runs+rbi', rationale: ['Leadoff PA volume', 'Favorable platoon split'], provenance: 'split model', lastUpdated: '2026-01-15T19:19:00.000Z' },
        { id: 'mlb2', player: 'Ronald Acuña Jr.', market: 'threes', line: '1.5 total bases', rationale: ['Barrel trend above baseline', 'Bullpen fatigue edge'], provenance: 'contact-quality feed', lastUpdated: '2026-01-15T19:19:00.000Z' },
        { id: 'mlb3', player: 'Freddie Freeman', market: 'ra', line: '1.5 hits+walks', rationale: ['Zone-contact advantage', 'Pitch mix fit'], provenance: 'pitch archetype model', lastUpdated: '2026-01-15T19:18:20.000Z' },
        { id: 'mlb4', player: 'Spencer Strider', market: 'assists', line: '8.5 strikeouts', rationale: ['Whiff-heavy profile', 'Projected long leash'], provenance: 'pitch model', lastUpdated: '2026-01-15T19:18:00.000Z' }
      ]
    },
    {
      id: 'soc-ars-mci-demo', league: 'Soccer', status: 'live', startTime: "63'", matchup: 'ARS vs MCI', teams: ['ARS', 'MCI'], bookContext: 'PrizePicks-style', provenance: 'Internal deterministic slate', lastUpdated: '2026-01-15T19:27:00.000Z',
      propsPreview: [
        { id: 'soc1', player: 'Erling Haaland', market: 'points', line: '3.5 shots', rationale: ['Penalty-box touches high', 'Set-piece upside'], provenance: 'event stream snapshot', lastUpdated: '2026-01-15T19:27:00.000Z' },
        { id: 'soc2', player: 'Bukayo Saka', market: 'assists', line: '1.5 chances', rationale: ['Corner duty active', 'Right-side overload'], provenance: 'chance-creation model', lastUpdated: '2026-01-15T19:26:40.000Z' },
        { id: 'soc3', player: 'Martin Ødegaard', market: 'pra', line: '2.5 shots+chances', rationale: ['Central progression share', 'Trailing script helps volume'], provenance: 'touch map model', lastUpdated: '2026-01-15T19:26:15.000Z' },
        { id: 'soc4', player: 'Phil Foden', market: 'threes', line: '1.5 shots on target', rationale: ['Weak-side half-space runs', 'Fresh legs after rotation'], provenance: 'live event feed', lastUpdated: '2026-01-15T19:26:00.000Z' }
      ]
    },
    {
      id: 'ufc-main-demo', league: 'UFC', status: 'upcoming', startTime: '10:45 PM ET', matchup: 'Pereira vs Aspinall', teams: ['Pereira', 'Aspinall'], bookContext: 'Underdog-style', provenance: 'Internal deterministic slate', lastUpdated: '2026-01-15T19:12:00.000Z',
      propsPreview: [
        { id: 'ufc1', player: 'Alex Pereira', market: 'points', line: '58.5 sig strikes', rationale: ['Distance tendency elevated', 'Counter lane available'], provenance: 'fight tape model', lastUpdated: '2026-01-15T19:11:30.000Z' },
        { id: 'ufc2', player: 'Tom Aspinall', market: 'assists', line: '1.5 takedowns', rationale: ['Wrestle-heavy path in sims', 'Reach neutralized on entries'], provenance: 'style matchup model', lastUpdated: '2026-01-15T19:11:20.000Z' },
        { id: 'ufc3', player: 'Alex Pereira', market: 'ra', line: '2.5 knockdowns+wins', rationale: ['Power carry deep', 'Low leg-kick vulnerability'], provenance: 'historical strike map', lastUpdated: '2026-01-15T19:11:00.000Z' },
        { id: 'ufc4', player: 'Tom Aspinall', market: 'pra', line: '7.5 control+subs', rationale: ['Top pressure path valid', 'Opponent get-up taxed late'], provenance: 'grappling model', lastUpdated: '2026-01-15T19:10:40.000Z' }
      ]
    },
    {
      id: 'nhl-nyr-bos-demo', league: 'NHL', status: 'upcoming', startTime: '7:35 PM ET', matchup: 'NYR @ BOS', teams: ['NYR', 'BOS'], bookContext: 'FanDuel-style', provenance: 'Internal deterministic slate', lastUpdated: '2026-01-15T19:15:00.000Z',
      propsPreview: [
        { id: 'nhl1', player: 'David Pastrňák', market: 'points', line: '4.5 shots', rationale: ['PP1 shot share', 'Neutral zone entries up'], provenance: 'xShots model', lastUpdated: '2026-01-15T19:14:30.000Z' },
        { id: 'nhl2', player: 'Artemi Panarin', market: 'assists', line: '0.5 assists', odds: '+110', rationale: ['Primary assist role on PP1', 'High-danger passes trending up'], provenance: 'on-ice creation model', lastUpdated: '2026-01-15T19:14:20.000Z' },
        { id: 'nhl3', player: 'Adam Fox', market: 'rebounds', line: '2.5 blocked shots', rationale: ['Top pair minutes', 'Opponent cycle pressure'], provenance: 'defense event feed', lastUpdated: '2026-01-15T19:14:00.000Z' },
        { id: 'nhl4', player: 'Igor Shesterkin', market: 'threes', line: '28.5 saves', rationale: ['Projected SOG against elevated', 'Back-to-back opponent legs'], provenance: 'goalie model', lastUpdated: '2026-01-15T19:13:40.000Z' }
      ]
    }
  ]
};



function buildBoardFromGames(payload: TodayPayload): TodayPayload['board'] {
  return payload.games.flatMap((game) => game.propsPreview.map((prop) => ({
    ...prop,
    gameId: game.id,
    matchup: game.matchup,
    startTime: game.startTime,
    mode: payload.mode,
    line: prop.line ?? '',
    odds: prop.odds ?? '-110',
    hitRateL10: typeof prop.hitRateL10 === 'number' ? prop.hitRateL10 : 55,
    marketImpliedProb: typeof prop.marketImpliedProb === 'number' ? prop.marketImpliedProb : 0.5,
    modelProb: typeof prop.modelProb === 'number' ? prop.modelProb : 0.55,
    edgeDelta: typeof prop.edgeDelta === 'number' ? prop.edgeDelta : 0.05,
    riskTag: prop.riskTag ?? 'watch'
  })));
}

export function createDemoTodayPayload(): TodayPayload {
  const payload = {
    ...DEMO_TODAY_PAYLOAD,
    leagues: [...DEMO_TODAY_PAYLOAD.leagues],
    games: DEMO_TODAY_PAYLOAD.games.map((game) => ({
      ...game,
      teams: [...game.teams],
      propsPreview: game.propsPreview.map((prop) => ({ ...prop, rationale: [...prop.rationale] }))
    }))
  };
  return { ...payload, board: buildBoardFromGames(payload) };
}
