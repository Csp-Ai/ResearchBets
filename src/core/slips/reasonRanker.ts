const trimPunctuation = (value: string) => value.replace(/[\s.;,:!?-]+$/g, '').trim();

export function normalizeReason(s: string): string {
  return trimPunctuation(s.replace(/\s+/g, ' ').trim());
}

export function dedupeReasons(reasons: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const reason of reasons) {
    const normalized = normalizeReason(reason);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }
  return deduped;
}

const scoreReason = (reason: string, opts?: { dominant?: string; correlation?: boolean; volatility?: string }): number => {
  const normalized = reason.toLowerCase();
  const dominant = opts?.dominant ? normalizeReason(opts.dominant).toLowerCase() : '';
  if (dominant && normalized === dominant) return 100;
  if (opts?.correlation && (normalized.includes('correlation') || normalized.includes('same-team') || normalized.includes('stack'))) return 90;
  if ((opts?.volatility && normalized.includes(opts.volatility.toLowerCase())) || normalized.includes('volatility') || normalized.includes('high-vol')) return 80;
  if (normalized.includes('fragility') || normalized.includes('weakest leg')) return 70;
  return 50;
};

export function rankReasons(reasons: string[], opts?: { dominant?: string; correlation?: boolean; volatility?: string }): string[] {
  return dedupeReasons(reasons)
    .map((reason, index) => ({ reason, score: scoreReason(reason, opts), index }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map((item) => item.reason);
}

export function selectTopReasons(reasons: string[], n = 3): string[] {
  return dedupeReasons(reasons).slice(0, Math.max(0, n));
}
