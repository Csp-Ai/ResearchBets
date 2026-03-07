import type { Mode } from '@/src/core/mode';

export type TruthTone = 'healthy' | 'degraded' | 'fallback';

export function getTruthModeCopy(input: { mode: Mode; reason?: string; intentMode?: Mode }) {
  const degraded = input.mode === 'cache' || Boolean(input.reason && input.reason !== 'live_ok');
  const label = input.mode === 'live'
    ? degraded
      ? 'Live (degraded)'
      : 'Live'
    : input.mode === 'cache'
      ? 'Cache fallback'
      : 'Demo mode (live feeds off)';

  const detail = input.mode === 'live'
    ? (degraded ? 'Some providers are degraded; board uses available signals.' : 'Provider-backed board is active.')
    : input.mode === 'cache'
      ? 'Serving cached board while live providers recover.'
      : 'Deterministic board is active because live feeds are unavailable or off.';

  const intentHint = input.intentMode === 'live' && input.mode !== 'live'
    ? input.mode === 'cache'
      ? 'Requested live; showing cache fallback.'
      : 'Requested live; running deterministic demo fallback.'
    : undefined;

  const tone: TruthTone = input.mode === 'demo' ? 'fallback' : degraded ? 'degraded' : 'healthy';

  return { label, detail, intentHint, tone };
}

export function getConfidenceCopy(input: { confidencePct: number; sourceQuality: 'verified' | 'mixed' | 'fallback' }) {
  const bounded = Math.max(0, Math.min(100, Math.round(input.confidencePct)));
  if (input.sourceQuality === 'verified') {
    return { label: `Signal confidence ${bounded}%`, boundedPct: bounded };
  }
  if (input.sourceQuality === 'mixed') {
    return { label: `Signal confidence ${bounded}% (mixed sources)`, boundedPct: Math.min(bounded, 75) };
  }
  return { label: `Signal confidence ${Math.min(bounded, 65)}% (fallback-limited)`, boundedPct: Math.min(bounded, 65) };
}
