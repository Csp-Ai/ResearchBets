import type { MarketType } from '@/src/core/markets/marketType';

export type NflLiveMarket =
  | 'passing_yards'
  | 'passing_tds'
  | 'rushing_yards'
  | 'receiving_yards'
  | 'receptions'
  | 'carries'
  | 'anytime_td';

export type SportsDataNflPlayerGame = Record<string, unknown>;
export type SportsDataNflScore = Record<string, unknown>;
export type SportsDataNflBoxScore = {
  Score?: SportsDataNflScore | null;
  PlayerGames?: SportsDataNflPlayerGame[] | null;
};

const NFL_LIVE_MARKETS = new Set<MarketType>([
  'passing_yards',
  'passing_tds',
  'rushing_yards',
  'receiving_yards',
  'receptions',
  'carries',
  'anytime_td',
]);

const NFL_TEAM_CODES = new Set([
  'ARI',
  'ATL',
  'BAL',
  'BUF',
  'CAR',
  'CHI',
  'CIN',
  'CLE',
  'DAL',
  'DEN',
  'DET',
  'GB',
  'HOU',
  'IND',
  'JAX',
  'KC',
  'LV',
  'LAC',
  'LAR',
  'MIA',
  'MIN',
  'NE',
  'NO',
  'NYG',
  'NYJ',
  'PHI',
  'PIT',
  'SEA',
  'SF',
  'TB',
  'TEN',
  'WAS',
]);

const NFL_TEAM_ALIASES: Record<string, string> = {
  'ARIZONA CARDINALS': 'ARI',
  'ATLANTA FALCONS': 'ATL',
  'BALTIMORE RAVENS': 'BAL',
  'BUFFALO BILLS': 'BUF',
  'CAROLINA PANTHERS': 'CAR',
  'CHICAGO BEARS': 'CHI',
  'CINCINNATI BENGALS': 'CIN',
  'CLEVELAND BROWNS': 'CLE',
  'DALLAS COWBOYS': 'DAL',
  'DENVER BRONCOS': 'DEN',
  'DETROIT LIONS': 'DET',
  'GREEN BAY PACKERS': 'GB',
  'HOUSTON TEXANS': 'HOU',
  'INDIANAPOLIS COLTS': 'IND',
  'JACKSONVILLE JAGUARS': 'JAX',
  'KANSAS CITY CHIEFS': 'KC',
  'LAS VEGAS RAIDERS': 'LV',
  'LOS ANGELES CHARGERS': 'LAC',
  'LOS ANGELES RAMS': 'LAR',
  'MIAMI DOLPHINS': 'MIA',
  'MINNESOTA VIKINGS': 'MIN',
  'NEW ENGLAND PATRIOTS': 'NE',
  'NEW ORLEANS SAINTS': 'NO',
  'NEW YORK GIANTS': 'NYG',
  'NEW YORK JETS': 'NYJ',
  'PHILADELPHIA EAGLES': 'PHI',
  'PITTSBURGH STEELERS': 'PIT',
  'SAN FRANCISCO 49ERS': 'SF',
  'SEATTLE SEAHAWKS': 'SEA',
  'TAMPA BAY BUCCANEERS': 'TB',
  'TENNESSEE TITANS': 'TEN',
  'WASHINGTON COMMANDERS': 'WAS',
};

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const canonicalNflTeamCode = (value: string): string | undefined => {
  const normalized = value.replace(/\s+/g, ' ').trim().toUpperCase();
  if (!normalized) return undefined;
  const alias = NFL_TEAM_ALIASES[normalized];
  if (alias) return alias;
  return NFL_TEAM_CODES.has(normalized) ? normalized : undefined;
};

export const isSupportedNflLiveMarket = (market: MarketType): market is NflLiveMarket =>
  NFL_LIVE_MARKETS.has(market);

export const normalizeNflPlayerName = (value: string): string => {
  const tokens = value
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .filter((token, index, all) => !(index === all.length - 1 && SUFFIXES.has(token)));
  return tokens.join(' ');
};

export const homeTeamFromGameId = (gameId?: string): string | undefined => {
  if (!gameId) return undefined;
  const normalized = gameId.replace(/\s+/g, ' ').trim().toUpperCase();

  const atSign = normalized.split(/\s*@\s*/);
  if (atSign.length === 2) return canonicalNflTeamCode(atSign[1] ?? '');

  const atWord = normalized.split(/\s+AT\s+/);
  if (atWord.length === 2) return canonicalNflTeamCode(atWord[1] ?? '');

  return undefined;
};

export const playerStatForMarket = (
  player: SportsDataNflPlayerGame,
  market: NflLiveMarket,
): number | undefined => {
  switch (market) {
    case 'passing_yards':
      return toNumber(player.PassingYards);
    case 'passing_tds':
      return toNumber(player.PassingTouchdowns);
    case 'rushing_yards':
      return toNumber(player.RushingYards);
    case 'receiving_yards':
      return toNumber(player.ReceivingYards);
    case 'receptions':
      return toNumber(player.Receptions);
    case 'carries':
      return toNumber(player.RushingAttempts);
    case 'anytime_td':
      return toNumber(player.Touchdowns);
  }
};

const quarterNumber = (value: unknown): 1 | 2 | 3 | 4 | undefined => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === '1' || raw === '2' || raw === '3' || raw === '4') return Number(raw) as 1 | 2 | 3 | 4;
  if (raw === 'HALF') return 2;
  if (raw === 'F' || raw === 'FINAL' || raw === 'F/OT') return 4;
  return undefined;
};

const remainingSeconds = (value: unknown): number | undefined => {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return undefined;
  return minutes * 60 + seconds;
};

export const nflClockFromScore = (score?: SportsDataNflScore | null) => {
  const rawQuarter = String(score?.Quarter ?? '').trim().toUpperCase();
  const quarter = quarterNumber(rawQuarter);
  if (!quarter) return undefined;
  const rawRemaining = remainingSeconds(score?.TimeRemaining);
  const isFinal = rawQuarter === 'F' || rawQuarter === 'FINAL' || rawQuarter === 'F/OT';
  const timeRemainingSec = isFinal
    ? 0
    : rawRemaining ?? (rawQuarter === 'HALF' ? 0 : 15 * 60);
  const elapsedBeforeQuarter = (quarter - 1) * 15;
  const elapsedInQuarter = 15 - timeRemainingSec / 60;
  return {
    quarter,
    timeRemainingSec,
    elapsedGameMinutes: Number(Math.max(0, Math.min(60, elapsedBeforeQuarter + elapsedInQuarter)).toFixed(2)),
  };
};

export const signedPlayerTeamMargin = (
  score: SportsDataNflScore | null | undefined,
  player: SportsDataNflPlayerGame,
): number | undefined => {
  const team = String(player.Team ?? '').trim().toUpperCase();
  const home = String(score?.HomeTeam ?? '').trim().toUpperCase();
  const away = String(score?.AwayTeam ?? '').trim().toUpperCase();
  const homeScore = toNumber(score?.HomeScore);
  const awayScore = toNumber(score?.AwayScore);
  if (!team || homeScore === undefined || awayScore === undefined) return undefined;
  if (team === home) return homeScore - awayScore;
  if (team === away) return awayScore - homeScore;
  return undefined;
};

export const findNflPlayer = (
  players: SportsDataNflPlayerGame[] | null | undefined,
  playerName: string,
): SportsDataNflPlayerGame | undefined => {
  const wanted = normalizeNflPlayerName(playerName);
  if (!wanted) return undefined;
  const exact = (players ?? []).find((player) =>
    normalizeNflPlayerName(String(player.Name ?? '')) === wanted,
  );
  if (exact) return exact;

  const wantedTokens = new Set(wanted.split(' '));
  return (players ?? []).find((player) => {
    const candidate = normalizeNflPlayerName(String(player.Name ?? ''));
    if (!candidate) return false;
    const tokens = candidate.split(' ');
    return tokens.length >= 2 && tokens.every((token) => wantedTokens.has(token));
  });
};
