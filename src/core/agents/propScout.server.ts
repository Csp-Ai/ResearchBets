import 'server-only';

export type PropScoutInputRow = {
  id: string;
  gameId: string;
  player: string;
  market: string;
  line?: string;
  odds?: string;
  marketImpliedProb: number;
  modelProb: number;
  edgeDelta: number;
  l5?: number;
  l10: number;
  volatility: 'low' | 'med' | 'high';
  riskTag: 'stable' | 'watch';
  reasoning: string;
  book_source?: string;
  line_variance?: number;
  book_count?: number;
};

export type PropScoutRecommendation = PropScoutInputRow & { score: number };

export function rankPropRecommendations(
  rows: PropScoutInputRow[],
  options?: { topN?: number; l10Weight?: number; edgeWeight?: number }
): PropScoutRecommendation[] {
  const topN = Math.max(1, options?.topN ?? 5);
  const l10Weight = options?.l10Weight ?? 0.35;
  const edgeWeight = options?.edgeWeight ?? 0.65;

  return rows
    .map((row) => ({
      ...row,
      score: Number((row.edgeDelta * edgeWeight + (row.l10 / 100) * l10Weight).toFixed(4))
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
