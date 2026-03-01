import type { MarketType } from '@/src/core/markets/marketType';

export type SampleBoardRow = {
  id: string;
  gameId: string;
  matchup: string;
  startTime: string;
  player: string;
  market: MarketType;
  line: string;
  odds: string;
  hitRateL10: number;
  riskTag: 'stable' | 'watch';
};

export const SAMPLE_SLATE: SampleBoardRow[] = [
  { id: 'nba_bos_nyk_brunson_ast', gameId: 'g1', matchup: 'NYK @ BOS', startTime: '7:10 PM ET', player: 'Jalen Brunson', market: 'assists', line: '6.5', odds: '-115', hitRateL10: 62, riskTag: 'watch' },
  { id: 'nba_bos_nyk_tatum_pts', gameId: 'g1', matchup: 'NYK @ BOS', startTime: '7:10 PM ET', player: 'Jayson Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 57, riskTag: 'stable' },
  { id: 'nba_lal_den_jokic_reb', gameId: 'g2', matchup: 'LAL @ DEN', startTime: '9:40 PM ET', player: 'Nikola Jokic', market: 'rebounds', line: '12.5', odds: '-108', hitRateL10: 55, riskTag: 'watch' },
  { id: 'nba_lal_den_davis_pts', gameId: 'g2', matchup: 'LAL @ DEN', startTime: '9:40 PM ET', player: 'Anthony Davis', market: 'points', line: '24.5', odds: '-112', hitRateL10: 60, riskTag: 'stable' },
  { id: 'nba_phx_gsw_booker_3pt', gameId: 'g3', matchup: 'PHX @ GSW', startTime: '10:10 PM ET', player: 'Devin Booker', market: 'threes', line: '2.5', odds: '+105', hitRateL10: 51, riskTag: 'watch' }
];

export const SAMPLE_SLIP_IDS = ['nba_bos_nyk_brunson_ast', 'nba_bos_nyk_tatum_pts', 'nba_lal_den_jokic_reb'];
