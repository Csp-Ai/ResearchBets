import type { NormalizedToday } from '@/src/core/today/normalize';

export type BoardLiveOdds = { book: string; odds: number | string; updated_at?: string };

export type LiveOddsPayload = {
  loadedAt?: string;
  games?: Array<{
    gameId: string;
    lines?: {
      homeMoneyline?: number;
      awayMoneyline?: number;
      spread?: number;
      total?: number;
    };
  }>;
};

export type BoardCardVM = {
  id: string;
  league?: string;
  game?: string;
  start?: string;
  marketLabel: string;
  selectionLabel: string;
  line?: number;
  hit_rate_l10?: number;
  consensus_odds?: number | string;
  live_odds?: BoardLiveOdds[];
  best_odds?: { book: string; odds: number | string };
  is_live: boolean;
};

const toNumeric = (value: number | string | undefined): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickBestOdds = (odds: BoardLiveOdds[]): { book: string; odds: number | string } | undefined => {
  if (odds.length === 0) return undefined;
  const sorted = [...odds].sort((left, right) => {
    const l = toNumeric(left.odds) ?? -Infinity;
    const r = toNumeric(right.odds) ?? -Infinity;
    return r - l;
  });
  const best = sorted[0];
  return best ? { book: best.book, odds: best.odds } : undefined;
};

const mapLiveOddsForGame = (gameId: string, live?: LiveOddsPayload): BoardLiveOdds[] => {
  if (!live?.games?.length) return [];
  const game = live.games.find((entry) => entry.gameId === gameId);
  if (!game?.lines) return [];

  const odds: BoardLiveOdds[] = [];
  if (typeof game.lines.homeMoneyline === 'number') {
    odds.push({ book: 'Home ML', odds: game.lines.homeMoneyline, updated_at: live.loadedAt });
  }
  if (typeof game.lines.awayMoneyline === 'number') {
    odds.push({ book: 'Away ML', odds: game.lines.awayMoneyline, updated_at: live.loadedAt });
  }
  if (typeof game.lines.spread === 'number') {
    odds.push({ book: 'Spread', odds: game.lines.spread, updated_at: live.loadedAt });
  }

  return odds.slice(0, 3);
};

export function buildBoardViewModel(today: NormalizedToday, live?: LiveOddsPayload): BoardCardVM[] {
  const gamesById = new Map(today.games.map((game) => [game.id, game]));

  const cards = today.board.map((prop) => {
    const game = gamesById.get(prop.gameId);
    const liveOdds = mapLiveOddsForGame(prop.gameId, live);
    const bestOdds = pickBestOdds(liveOdds);

    return {
      id: prop.id,
      league: undefined,
      game: game?.matchup,
      start: game?.startTime,
      marketLabel: prop.market,
      selectionLabel: `${prop.player} ${prop.market} ${prop.line}`,
      line: Number(prop.line),
      hit_rate_l10: prop.hitRateL10,
      consensus_odds: prop.odds,
      live_odds: liveOdds.length > 0 ? liveOdds : undefined,
      best_odds: bestOdds,
      is_live: liveOdds.length > 0
    } satisfies BoardCardVM;
  });

  return cards.length > 0 ? cards : [
    {
      id: 'fallback-board-item',
      marketLabel: 'points',
      selectionLabel: 'Fallback board item',
      consensus_odds: '-110',
      is_live: false
    }
  ];
}
