import { formatPct, formatSignedPct } from '@/src/core/markets/edgePrimitives';
import type { BoardRow } from '@/src/core/today/types';
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
  market_implied_prob: string;
  model_prob: string;
  edge_delta: string;
  risk_tag: 'stable' | 'watch';
  confidence_pct?: number;
  source?: string;
  live_odds?: BoardLiveOdds[];
  best_odds?: { book: string; odds: number | string };
  is_live: boolean;
  row: BoardRow;
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
      game: game?.matchup ?? prop.matchup,
      start: game?.startTime ?? prop.startTime,
      marketLabel: prop.market,
      selectionLabel: `${prop.player} ${prop.market} ${prop.line}`,
      line: Number(prop.line),
      hit_rate_l10: prop.hitRateL10,
      consensus_odds: prop.odds,
      market_implied_prob: formatPct(prop.marketImpliedProb),
      model_prob: formatPct(prop.modelProb),
      edge_delta: formatSignedPct(prop.edgeDelta),
      risk_tag: prop.riskTag,
      confidence_pct: prop.confidencePct,
      source: prop.source,
      live_odds: liveOdds.length > 0 ? liveOdds : undefined,
      best_odds: bestOdds,
      is_live: liveOdds.length > 0,
      row: prop,
    } satisfies BoardCardVM;
  });

  return cards.length > 0 ? cards : [
    {
      id: 'fallback-board-item',
      marketLabel: 'points',
      selectionLabel: 'Fallback board item',
      consensus_odds: '-110',
      market_implied_prob: '50.0%',
      model_prob: '50.0%',
      edge_delta: '+0.0%',
      risk_tag: 'watch',
      is_live: false,
      row: {
        id: 'fallback-board-item',
        gameId: 'fallback',
        player: 'Fallback',
        market: 'points',
        line: '0.5',
        odds: '-110',
        hitRateL10: 50,
        marketImpliedProb: 0.5,
        modelProb: 0.5,
        edgeDelta: 0,
        riskTag: 'watch'
      }
    }
  ];
}
