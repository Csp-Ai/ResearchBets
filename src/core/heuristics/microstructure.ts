import type { MarketGame } from '../markets/marketData';

export type HeuristicSignal = {
  name: string;
  label: string;
  direction: 'up' | 'down' | 'neutral';
  confidence_band: {
    min: number;
    max: number;
    label: 'low' | 'medium' | 'elevated';
  };
  rationale: string;
};

export type HeuristicMicrostructureResult = {
  is_heuristic: true;
  signals: HeuristicSignal[];
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const determineBand = (spread: number): HeuristicSignal['confidence_band'] => {
  if (spread >= 0.25) return { min: 0.2, max: 0.45, label: 'low' };
  if (spread >= 0.12) return { min: 0.3, max: 0.6, label: 'medium' };
  return { min: 0.45, max: 0.7, label: 'elevated' };
};

const computeMinutesToStart = (loadedAtIso: string, startsAtIso: string): number => {
  const loadedAt = Date.parse(loadedAtIso);
  const startsAt = Date.parse(startsAtIso);
  if (Number.isNaN(loadedAt) || Number.isNaN(startsAt)) return 0;
  return Math.round((startsAt - loadedAt) / 60_000);
};

export function evaluateHeuristicMicrostructure(input: {
  game: Pick<
    MarketGame,
    'gameId' | 'startsAt' | 'implied' | 'lines' | 'degraded' | 'source' | 'homeTeam' | 'awayTeam'
  >;
  snapshotLoadedAt: string;
}): HeuristicMicrostructureResult {
  const { game, snapshotLoadedAt } = input;
  const minutesToStart = computeMinutesToStart(snapshotLoadedAt, game.startsAt);
  const impliedSpread = Math.abs(game.implied.home - game.implied.away);
  const lineSkew =
    Math.abs((game.lines.homeMoneyline ?? 0) - Math.abs(game.lines.awayMoneyline ?? 0)) / 300;

  const steamDirection: HeuristicSignal['direction'] =
    minutesToStart <= 45 && impliedSpread >= 0.06 ? 'up' : 'neutral';
  const steamBand = determineBand(Math.abs(0.2 - clamp(impliedSpread + lineSkew * 0.15, 0, 0.4)));

  const newsLagDirection: HeuristicSignal['direction'] =
    game.degraded || game.implied.source === 'fallback'
      ? 'down'
      : minutesToStart > 180
        ? 'neutral'
        : 'up';
  const lagBand = game.degraded
    ? { min: 0.2, max: 0.4, label: 'low' as const }
    : { min: 0.35, max: 0.62, label: 'medium' as const };

  const spread = game.lines.spread ?? 0;
  const total = game.lines.total ?? 0;
  const compressedBook =
    Math.abs(spread) <= 3.5 && total > 0 ? clamp(Math.abs(total - 45) / 40, 0, 1) : 0.5;
  const bookDirection: HeuristicSignal['direction'] = compressedBook < 0.35 ? 'up' : 'neutral';

  return {
    is_heuristic: true,
    signals: [
      {
        name: 'steam_window',
        label: 'Steam window',
        direction: steamDirection,
        confidence_band: steamBand,
        rationale:
          minutesToStart <= 45
            ? `Kickoff proximity (${minutesToStart}m) with implied split ${(impliedSpread * 100).toFixed(1)}% can indicate late-book pressure. Heuristic only.`
            : `Kickoff is ${minutesToStart}m away; steam-style pressure is treated as lower urgency in this heuristic.`
      },
      {
        name: 'news_lag_heuristic',
        label: 'News-lag heuristic',
        direction: newsLagDirection,
        confidence_band: lagBand,
        rationale: game.degraded
          ? `Market snapshot flagged as degraded (${game.source}); stale-input risk elevated between ${game.awayTeam} and ${game.homeTeam}. Heuristic only.`
          : `No explicit degradation flag. Timing window (${minutesToStart}m) is used as a proxy for potential headline-to-market lag. Heuristic only.`
      },
      {
        name: 'book_divergence_compression',
        label: 'Book divergence compression',
        direction: bookDirection,
        confidence_band:
          compressedBook < 0.35
            ? { min: 0.42, max: 0.68, label: 'elevated' }
            : { min: 0.25, max: 0.5, label: 'low' },
        rationale: `Spread ${spread.toFixed(1)} and total ${total.toFixed(1)} are compared to a neutral baseline to classify cross-market compression. Heuristic only.`
      }
    ]
  };
}
