import type { ScoutCard, TodayBoardRow, TodayPayloadLike } from '@/src/core/scout/types';

const asNumber = (value: unknown): number | null => {
  const normalized = typeof value === 'string' ? Number(value) : value;
  return typeof normalized === 'number' && Number.isFinite(normalized) ? normalized : null;
};

const asPercent = (value: number | null) => (value === null ? '—' : `${Math.round(value)}%`);

const getRiskTag = (row: TodayBoardRow): 'stable' | 'watch' => (row.riskTag === 'stable' ? 'stable' : 'watch');

export function deriveScoutCards(payload: TodayPayloadLike): { cards: ScoutCard[]; topSignal?: string } {
  const board = payload.board.slice(0, 24);
  if (!board.length) return { cards: [] };

  const cards: ScoutCard[] = [];

  const divergenceCandidate = [...board]
    .map((row) => {
      const l10 = asNumber(row.hitRateL10);
      const l5 = asNumber((row as { hitRateL5?: number }).hitRateL5 ?? null);
      return { row, l10, l5, divergence: l10 !== null && l5 !== null ? Math.abs(l10 - l5) : -1 };
    })
    .sort((a, b) => b.divergence - a.divergence)[0];

  if (divergenceCandidate && divergenceCandidate.divergence >= 12) {
    const { row, l5, l10, divergence } = divergenceCandidate;
    cards.push({
      id: `l5-l10-${row.id}`,
      title: 'Recent form tension',
      hooks: [
        `${row.player} shows L5/L10 split pressure (${asPercent(l5)} vs ${asPercent(l10)}).`,
        `Momentum and longer sample disagree by ${Math.round(divergence)} pts.`
      ],
      evidence: [
        `${row.market} ${row.line} at ${row.odds}`,
        `Model ${asPercent(asNumber((row as { modelProb?: number }).modelProb ?? null))} vs implied ${asPercent(asNumber((row as { marketImpliedProb?: number }).marketImpliedProb ?? null))}`
      ],
      riskTags: ['watch', divergence >= 20 ? 'fragile' : 'stable'],
      ctaLabel: 'Open board filter',
      ctaPath: '/today',
      ctaQuery: { focus: row.gameId, prop: row.id, signal: 'l5_l10_divergence' }
    });
  }

  const underdog = [...board]
    .filter((row) => row.odds.startsWith('+'))
    .map((row) => ({
      row,
      hitRate: asNumber(row.hitRateL10),
      implied: asNumber((row as { marketImpliedProb?: number }).marketImpliedProb ?? null),
      edge: asNumber((row as { edgeDelta?: number }).edgeDelta ?? null)
    }))
    .sort((a, b) => (b.edge ?? -999) - (a.edge ?? -999))[0];

  if (underdog && (underdog.edge ?? 0) > 1) {
    cards.push({
      id: `underdog-${underdog.row.id}`,
      title: 'Contrarian price pressure',
      hooks: [
        `${underdog.row.player} is priced as plus-money while internal edge stays positive.`,
        `Implied ${asPercent(underdog.implied)} vs hit-rate ${asPercent(underdog.hitRate)} creates mismatch.`
      ],
      evidence: [
        `${underdog.row.market} ${underdog.row.line} (${underdog.row.odds})`,
        `Edge delta ${underdog.edge?.toFixed(1) ?? '—'} pts`
      ],
      riskTags: [getRiskTag(underdog.row), 'watch'],
      ctaLabel: 'Stress-test angle',
      ctaPath: '/stress-test',
      ctaQuery: { source: 'scout_card', seed_prop: underdog.row.id }
    });
  }

  const varianceRow = [...board]
    .map((row) => ({ row, variance: asNumber((row as { line_variance?: number }).line_variance ?? null), books: asNumber((row as { book_count?: number }).book_count ?? null) }))
    .filter((entry) => entry.variance !== null && entry.books !== null && entry.books >= 2)
    .sort((a, b) => (b.variance ?? -1) - (a.variance ?? -1))[0];

  if (varianceRow && (varianceRow.variance ?? 0) > 0) {
    cards.push({
      id: `books-${varianceRow.row.id}`,
      title: 'Comparative market disagreement',
      hooks: [
        `${varianceRow.books} books are not aligned on this line.`,
        `Cross-book variance sits at ${varianceRow.variance?.toFixed(2)}.`
      ],
      evidence: [
        `${varianceRow.row.player} ${varianceRow.row.market} ${varianceRow.row.line}`,
        `Current tag: ${getRiskTag(varianceRow.row)}`
      ],
      riskTags: ['watch', 'correlation'],
      ctaLabel: 'Review game panel',
      ctaPath: '/today',
      ctaQuery: { focus: varianceRow.row.gameId, signal: 'book_disagreement' }
    });
  }

  const cardsOut = cards.slice(0, 3);
  const volatileCount = board.filter((row) => row.riskTag === 'watch').length;
  const topSignal = volatileCount > 0 ? `${volatileCount} props are tagged watch risk right now.` : undefined;

  return { cards: cardsOut, topSignal };
}
