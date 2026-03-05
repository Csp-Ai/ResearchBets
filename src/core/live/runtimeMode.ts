export type ProviderHealthSummary = {
  mode: 'live' | 'cache' | 'demo';
  reason?: string;
  checks?: {
    odds?: { ok: boolean };
    events?: { ok: boolean };
    stats?: string;
  };
  providerErrors?: string[];
};

export type RuntimeModeIntent = 'live' | 'demo';

export type ResolvedRuntimeMode = {
  mode: 'live' | 'cache' | 'demo';
  reason: string;
  source: 'url' | 'provider-health' | 'fallback';
};

function readParam(searchParams: URLSearchParams | Record<string, string | string[] | undefined>, key: string): string | null {
  if (searchParams instanceof URLSearchParams) return searchParams.get(key);
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function parseUrlModeIntent(searchParams: URLSearchParams | Record<string, string | string[] | undefined>): RuntimeModeIntent | null {
  if (readParam(searchParams, 'demo') === '1') return 'demo';

  const mode = readParam(searchParams, 'mode')?.toLowerCase();
  if (mode === 'demo' || mode === 'live') return mode;

  return null;
}

export function resolveRuntimeMode({
  urlIntent,
  providerHealth,
}: {
  urlIntent: RuntimeModeIntent | null;
  providerHealth?: ProviderHealthSummary | null;
}): ResolvedRuntimeMode {
  if (urlIntent === 'demo') {
    return { mode: 'demo', reason: 'explicit_demo', source: 'url' };
  }

  if (urlIntent === 'live') {
    if (providerHealth?.mode === 'live') {
      return { mode: 'live', reason: providerHealth.reason ?? 'live_ok', source: 'url' };
    }
    if (providerHealth?.mode === 'cache') {
      return { mode: 'cache', reason: providerHealth.reason ?? 'provider_degraded', source: 'url' };
    }
    return { mode: 'demo', reason: providerHealth?.reason ?? 'provider_unavailable', source: 'url' };
  }

  if (providerHealth?.mode) {
    return {
      mode: providerHealth.mode,
      reason: providerHealth.reason ?? 'provider_health',
      source: 'provider-health',
    };
  }

  return { mode: 'demo', reason: 'fallback_demo', source: 'fallback' };
}

export function deriveModeLabel(resolved: ResolvedRuntimeMode): string {
  if (resolved.mode === 'live') return 'Live feeds active';
  if (resolved.mode === 'cache') return 'Limited live feeds (degraded)';
  return 'Demo mode (live feeds off)';
}
