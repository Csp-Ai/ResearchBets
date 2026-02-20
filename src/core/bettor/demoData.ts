export type PropSuggestion = {
  id: string;
  player: string;
  team: string;
  role: string;
  market: string;
  line: number;
  odds: string;
  hitRateL5: number;
  hitRateL10: number;
  reasons: string[];
  uncertainty: string;
  contributingAgents: string[];
};

export type BettorGame = {
  id: string;
  league: 'NBA';
  status: 'live' | 'upcoming';
  startTime: string;
  matchup: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  homeWinProbability: number;
  awayWinProbability: number;
  matchupReasons: string[];
  activePlayers: Array<{ name: string; team: string; role: string; status: 'active' }>;
  propSuggestions: PropSuggestion[];
};

export const DEMO_GAMES: BettorGame[] = [
  {
    id: 'nba-lal-dal',
    league: 'NBA',
    status: 'live',
    startTime: 'Q3 08:13',
    matchup: 'Lakers @ Mavericks',
    homeTeam: 'DAL',
    awayTeam: 'LAL',
    homeRecord: '34-25',
    awayRecord: '33-27',
    homeWinProbability: 0.57,
    awayWinProbability: 0.43,
    matchupReasons: [
      'Dallas has been stronger in half-court efficiency over the last 10 games.',
      'Lakers are on a back-to-back, which can reduce late-game legs.',
      'Home-court and recent shot quality slightly favor Dallas.'
    ],
    activePlayers: [
      { name: 'Luka Doncic', team: 'DAL', role: 'PG', status: 'active' },
      { name: 'Kyrie Irving', team: 'DAL', role: 'G', status: 'active' },
      { name: 'LeBron James', team: 'LAL', role: 'F', status: 'active' },
      { name: 'Austin Reaves', team: 'LAL', role: 'G', status: 'active' }
    ],
    propSuggestions: [
      {
        id: 'luka-assists',
        player: 'Luka Doncic',
        team: 'DAL',
        role: 'PG',
        market: 'Assists Over',
        line: 8.5,
        odds: '-118',
        hitRateL5: 0.8,
        hitRateL10: 0.7,
        reasons: ['He has hit this in 4/5 games.', 'High on-ball usage with starters healthy.', 'Lakers allow elevated assists to lead creators.'],
        uncertainty: 'Monitor blowout risk; usage can dip late if margin widens.',
        contributingAgents: ['Trend Rider', 'Matchup Sniper', 'Coach Talk']
      },
      {
        id: 'lebron-rebounds',
        player: 'LeBron James',
        team: 'LAL',
        role: 'F',
        market: 'Rebounds Over',
        line: 7.5,
        odds: '-110',
        hitRateL5: 0.6,
        hitRateL10: 0.6,
        reasons: ['Hit 3/5 recently.', 'Dallas shot profile creates long rebound chances.', 'Minutes projection remains strong in close games.'],
        uncertainty: 'Back-to-back fatigue can impact second-half rebound effort.',
        contributingAgents: ['Injury Insider', 'Trend Rider']
      }
    ]
  },
  {
    id: 'nba-bos-mia',
    league: 'NBA',
    status: 'upcoming',
    startTime: '7:30 PM ET',
    matchup: 'Celtics @ Heat',
    homeTeam: 'MIA',
    awayTeam: 'BOS',
    homeRecord: '30-30',
    awayRecord: '45-14',
    homeWinProbability: 0.36,
    awayWinProbability: 0.64,
    matchupReasons: [
      'Boston has had the better net rating over the last 15 games.',
      'Miami is currently missing two rotation wings.',
      'Celtics maintain strong away shooting efficiency.'
    ],
    activePlayers: [
      { name: 'Jayson Tatum', team: 'BOS', role: 'F', status: 'active' },
      { name: 'Jaylen Brown', team: 'BOS', role: 'G/F', status: 'active' },
      { name: 'Bam Adebayo', team: 'MIA', role: 'C', status: 'active' },
      { name: 'Tyler Herro', team: 'MIA', role: 'G', status: 'active' }
    ],
    propSuggestions: [
      {
        id: 'tatum-points',
        player: 'Jayson Tatum',
        team: 'BOS',
        role: 'F',
        market: 'Points Over',
        line: 28.5,
        odds: '-112',
        hitRateL5: 0.8,
        hitRateL10: 0.7,
        reasons: ['He has cleared this in 4/5.', 'Usage spikes in competitive road games.', 'Miami wing injuries open scoring lanes.'],
        uncertainty: 'If Boston leads early, fourth-quarter volume can decline.',
        contributingAgents: ['Prop Finder', 'Injury Insider', 'Line Sensei']
      }
    ]
  }
];
