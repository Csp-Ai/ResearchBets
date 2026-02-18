export interface PlayerPropMomentum {
  propId: string;
  gameId: string;
  sport: string;
  player: string;
  market: string;
  line: number;
  last10HitRate: number;
  volatilityTag: 'steady' | 'swingy';
}

const DEMO_PROPS: Record<string, PlayerPropMomentum[]> = {
  NFL: [
    {
      propId: 'nfl_prop_1',
      gameId: 'NFL_DEMO_1',
      sport: 'NFL',
      player: 'Josh Allen',
      market: 'Pass TDs',
      line: 1.5,
      last10HitRate: 0.7,
      volatilityTag: 'steady'
    },
    {
      propId: 'nfl_prop_2',
      gameId: 'NFL_DEMO_1',
      sport: 'NFL',
      player: 'Patrick Mahomes',
      market: 'Pass Yards',
      line: 275.5,
      last10HitRate: 0.5,
      volatilityTag: 'swingy'
    }
  ],
  NBA: [
    {
      propId: 'nba_prop_1',
      gameId: 'NBA_DEMO_1',
      sport: 'NBA',
      player: 'Jayson Tatum',
      market: 'Points',
      line: 29.5,
      last10HitRate: 0.6,
      volatilityTag: 'steady'
    },
    {
      propId: 'nba_prop_2',
      gameId: 'NBA_DEMO_1',
      sport: 'NBA',
      player: 'LeBron James',
      market: 'Assists',
      line: 7.5,
      last10HitRate: 0.4,
      volatilityTag: 'swingy'
    }
  ],
  NHL: [
    {
      propId: 'nhl_prop_1',
      gameId: 'NHL_DEMO_1',
      sport: 'NHL',
      player: 'Artemi Panarin',
      market: 'Shots',
      line: 3.5,
      last10HitRate: 0.7,
      volatilityTag: 'steady'
    }
  ],
  MLB: [
    {
      propId: 'mlb_prop_1',
      gameId: 'MLB_DEMO_1',
      sport: 'MLB',
      player: 'Mookie Betts',
      market: 'Hits',
      line: 1.5,
      last10HitRate: 0.5,
      volatilityTag: 'swingy'
    }
  ],
  Soccer: [
    {
      propId: 'soccer_prop_1',
      gameId: 'SOCCER_DEMO_1',
      sport: 'Soccer',
      player: 'Erling Haaland',
      market: 'Shots on Target',
      line: 2.5,
      last10HitRate: 0.8,
      volatilityTag: 'steady'
    }
  ],
  UFC: [
    {
      propId: 'ufc_prop_1',
      gameId: 'UFC_DEMO_1',
      sport: 'UFC',
      player: 'Alex Pereira',
      market: 'Significant Strikes',
      line: 64.5,
      last10HitRate: 0.4,
      volatilityTag: 'swingy'
    }
  ]
};

export function getPlayerPropsMomentum(gameId: string, sport: string): PlayerPropMomentum[] {
  const bySport = DEMO_PROPS[sport] ?? [];
  const filtered = bySport.filter((prop) => prop.gameId === gameId);
  return filtered.length > 0 ? filtered : [];
}
