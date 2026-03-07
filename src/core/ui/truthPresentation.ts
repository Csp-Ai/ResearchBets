import type { Mode } from '@/src/core/mode';

export type TruthTone = 'healthy' | 'degraded' | 'fallback';
export type SourceQualityTier = 'verified' | 'mixed' | 'fallback';

export type TodayRuntimeSummary = {
  modeLabel: string;
  modeDetail: string;
  modeTone: TruthTone;
  sourceLabel: string;
  sourceDetail: string;
  sourceTier: SourceQualityTier;
  freshnessLabel: string;
  freshnessDetail: string;
  fallbackDetail?: string;
  bannerLabel: string;
  bannerDetail: string;
};

function dedupeSegments(parts: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const part of parts) {
    const cleaned = part?.trim();
    if (!cleaned) continue;
    const token = cleaned.toLowerCase();
    if (seen.has(token)) continue;
    seen.add(token);
    output.push(cleaned);
  }
  return output;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MAX_FRESHNESS_WINDOW_MS = 7 * DAY;

export function getTruthModeCopy(input: { mode: Mode; reason?: string; intentMode?: Mode }) {
  const degraded = input.mode === 'cache' || Boolean(input.reason && input.reason !== 'live_ok');
  const label = input.mode === 'live'
    ? degraded
      ? 'Live board active (degraded)'
      : 'Live board active'
    : input.mode === 'cache'
      ? 'Cached board active'
      : 'Demo board active';

  const detail = input.mode === 'live'
    ? (degraded ? 'Some live feeds are unstable; board is using available signals.' : 'Provider-backed lines and context are in sync.')
    : input.mode === 'cache'
      ? 'Using the latest available snapshot while live feeds recover.'
      : 'Using a deterministic slate because live feeds are unavailable or off.';

  const intentHint = input.intentMode === 'live' && input.mode !== 'live'
    ? input.mode === 'cache'
      ? 'Requested live; showing cache fallback.'
      : 'Requested live; showing deterministic demo slate.'
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
      detail: 'Primary providers are available for this board.'
    };
  }

  if (tier === 'mixed') {
    return {
      tier,
      label: 'Source quality: mixed',
      detail: input.degradedReason ?? input.reason ?? 'Some live inputs are degraded, so parts of the board may rely on fallback data.'
    };
  }

  return {
    tier,
    label: 'Source quality: demo fallback',
    detail: input.degradedReason ?? input.reason ?? 'Deterministic fallback data is powering this board.'
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

export function buildTodayRuntimeSummary(input: {
  mode: Mode;
  reason?: string;
  degraded?: boolean;
  degradedReason?: string;
  generatedAt?: string;
  intentMode?: Mode;
  nowMs?: number;
}): TodayRuntimeSummary {
  const mode = getTruthModeCopy({
    mode: input.mode,
    reason: input.reason,
    intentMode: input.intentMode
  });
  const source = getSourceQualityCopy({
    mode: input.mode,
    reason: input.reason,
    degraded: input.degraded,
    degradedReason: input.degradedReason
  });
  const freshness = getFreshnessCopy({
    mode: input.mode,
    generatedAt: input.generatedAt,
    nowMs: input.nowMs
  });

  const fallbackDetail = input.mode === 'demo' || input.mode === 'cache' || source.tier !== 'verified'
    ? mode.intentHint ?? input.degradedReason ?? input.reason ?? source.detail
    : undefined;

  const bannerLabel = mode.label;
  const bannerDetail = dedupeSegments([mode.detail, source.detail, fallbackDetail]).join(' ');

  return {
    modeLabel: mode.label,
    modeDetail: mode.detail,
    modeTone: mode.tone,
    sourceLabel: source.label,
    sourceDetail: source.detail,
    sourceTier: source.tier,
    freshnessLabel: freshness.label,
    freshnessDetail: freshness.detail,
    fallbackDetail,
    bannerLabel,
    bannerDetail
  };
}
