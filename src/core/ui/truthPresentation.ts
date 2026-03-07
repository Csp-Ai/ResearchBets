import type { Mode } from '@/src/core/mode';

export type TruthTone = 'healthy' | 'degraded' | 'fallback';
export type SourceQualityTier = 'verified' | 'mixed' | 'fallback';

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

export function getSourceQualityCopy(input: { mode: Mode; reason?: string; degraded?: boolean; degradedReason?: string }) {
  const tier: SourceQualityTier = input.mode === 'demo'
    ? 'fallback'
    : input.mode === 'cache' || input.degraded
      ? 'mixed'
      : 'verified';

  if (tier === 'verified') {
    return {
      tier,
      label: 'Source quality: verified',
      detail: 'Primary provider sources are available for this decision surface.'
    };
  }

  if (tier === 'mixed') {
    return {
      tier,
      label: 'Source quality: mixed',
      detail: input.degradedReason ?? input.reason ?? 'Some provider signals are degraded; outputs may include partial fallback data.'
    };
  }

  return {
    tier,
    label: 'Source quality: fallback-limited',
    detail: input.degradedReason ?? input.reason ?? 'Deterministic fallback and heuristics are carrying this surface.'
  };
}

export function getConfidenceCopy(input: { confidencePct: number; sourceQuality: SourceQualityTier }) {
  const bounded = Math.max(0, Math.min(100, Math.round(input.confidencePct)));
  if (input.sourceQuality === 'verified') {
    return { label: `Signal confidence ${bounded}%`, boundedPct: bounded };
  }
  if (input.sourceQuality === 'mixed') {
    return { label: `Signal confidence ${bounded}% (mixed sources)`, boundedPct: Math.min(bounded, 75) };
  }
  return { label: `Signal confidence ${Math.min(bounded, 65)}% (fallback-limited)`, boundedPct: Math.min(bounded, 65) };
}
