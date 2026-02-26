import 'server-only';

const heuristicWeights = new Map<string, number>();

export type OutcomeResult = 'win' | 'loss' | 'push';

export function updateWeights(selectionKey: string, result: OutcomeResult): { selectionKey: string; nextWeight: number; delta: number } {
  const current = heuristicWeights.get(selectionKey) ?? 1;
  const delta = result === 'win' ? 0.02 : result === 'loss' ? -0.02 : 0;
  const next = Math.max(0.75, Math.min(1.25, Number((current + delta).toFixed(4))));
  heuristicWeights.set(selectionKey, next);
  return { selectionKey, nextWeight: next, delta };
}
