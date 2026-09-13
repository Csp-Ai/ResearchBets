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

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
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
  const at = normalized.match(/([A-Z]{2,4})\s*@\s*([A-Z]{2,4})/);
  if (at?.[2]) return at[2];
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
  if (raw === 'OT' || raw === 'F' || raw === 'F/OT') return 4;
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
  const quarter = quarterNumber(score?.Quarter);
  if (!quarter) return undefined;
  const rawRemaining = remainingSeconds(score?.TimeRemaining);
  const timeRemainingSec = rawRemaining ?? (String(score?.Quarter ?? '').toUpperCase() === 'HALF' ? 0 : 15 * 60);
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
