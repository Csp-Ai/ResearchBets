import type { Mode } from '@/src/core/mode';

export type TruthTone = 'healthy' | 'degraded' | 'fallback';
export type SourceQualityTier = 'verified' | 'mixed' | 'fallback';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MAX_FRESHNESS_WINDOW_MS = 7 * DAY;

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
      label: 'Sources: verified',
      detail: 'Primary provider sources are available for this decision surface.'
    };
  }

  if (tier === 'mixed') {
    return {
      tier,
      label: 'Sources: mixed',
      detail: input.degradedReason ?? input.reason ?? 'Some provider signals are degraded; outputs may include partial fallback data.'
    };
  }

  return {
    tier,
    label: 'Sources: demo fallback',
    detail: input.degradedReason ?? input.reason ?? 'Deterministic fallback and heuristics are carrying this surface.'
  };
}

export function getFreshnessCopy(input: { mode: Mode; generatedAt?: string; nowMs?: number }) {
  if (input.mode === 'demo') {
    return {
      label: 'Demo snapshot',
      detail: 'Deterministic sample data refreshes only when the demo slate is rebuilt.'
    };
  }

  if (!input.generatedAt) {
    return {
      label: 'Update time unavailable',
      detail: 'Board timestamp is missing from this response.'
    };
  }

  const timestamp = new Date(input.generatedAt).getTime();
  if (!Number.isFinite(timestamp)) {
    return {
      label: 'Update time unavailable',
      detail: 'Board timestamp could not be parsed.'
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  if (!Number.isFinite(nowMs)) {
    return {
      label: 'Update time unavailable',
      detail: 'Current time reference is unavailable for freshness formatting.'
    };
  }

  const diff = nowMs - timestamp;
  if (diff < 0) {
    return {
      label: 'just now',
      detail: 'Board timestamp is ahead of local clock; showing nearest truthful freshness label.'
    };
  }

  if (diff > MAX_FRESHNESS_WINDOW_MS) {
    return {
      label: 'Update time unavailable',
      detail: 'Board timestamp is outside the freshness window.'
    };
  }

  if (diff < MINUTE) return { label: 'just now', detail: 'Board was refreshed moments ago.' };
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return { label: `${minutes} min ago`, detail: 'Board freshness reflects provider or cache update time.' };
  }
  const hours = Math.floor(diff / HOUR);
  return { label: `${hours}h ago`, detail: 'Board freshness reflects provider or cache update time.' };
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
