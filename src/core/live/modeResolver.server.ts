import 'server-only';

export type RuntimeMode = 'live' | 'demo';

export type ModeReason =
  | 'live_ok'
  | 'demo_requested'
  | 'live_mode_disabled'
  | 'missing_keys'
  | 'provider_unavailable';

export type ResolvedMode = {
  mode: RuntimeMode;
  reason: ModeReason;
  publicLabel: 'Live feeds on' | 'Demo mode (live feeds off)';
  dataFreshnessLabel: string;
  isProduction: boolean;
};

const LIVE_KEY_NAMES = ['THEODDSAPI_KEY', 'ODDS_API_KEY', 'SPORTSDATA_API_KEY'] as const;

const hasAnyLiveKey = () => LIVE_KEY_NAMES.some((key) => Boolean(process.env[key]));

const readLiveModeEnv = () => (process.env.LIVE_MODE ?? 'false').toLowerCase() === 'true';

const isProductionRuntime = () => {
  const vercelEnv = process.env.VERCEL_ENV;
  return vercelEnv === 'production' || process.env.NODE_ENV === 'production';
};

export function resolveRuntimeMode(options?: { demoRequested?: boolean; providerFailed?: boolean }): ResolvedMode {
  const demoRequested = options?.demoRequested === true;
  const providerFailed = options?.providerFailed === true;
  const liveModeEnabled = readLiveModeEnv();
  const production = isProductionRuntime();
  const liveEligible = liveModeEnabled && hasAnyLiveKey();

  if (demoRequested) {
    return {
      mode: 'demo',
      reason: 'demo_requested',
      publicLabel: 'Demo mode (live feeds off)',
      dataFreshnessLabel: 'Demo dataset',
      isProduction: production
    };
  }

  if (!liveModeEnabled) {
    return {
      mode: 'demo',
      reason: 'live_mode_disabled',
      publicLabel: 'Demo mode (live feeds off)',
      dataFreshnessLabel: 'Demo dataset',
      isProduction: production
    };
  }

  if (!hasAnyLiveKey()) {
    return {
      mode: 'demo',
      reason: 'missing_keys',
      publicLabel: 'Demo mode (live feeds off)',
      dataFreshnessLabel: 'Demo dataset',
      isProduction: production
    };
  }

  if (providerFailed) {
    return {
      mode: 'demo',
      reason: 'provider_unavailable',
      publicLabel: 'Demo mode (live feeds off)',
      dataFreshnessLabel: 'Demo dataset',
      isProduction: production
    };
  }

  return {
    mode: liveEligible ? 'live' : 'demo',
    reason: liveEligible ? 'live_ok' : 'missing_keys',
    publicLabel: liveEligible ? 'Live feeds on' : 'Demo mode (live feeds off)',
    dataFreshnessLabel: liveEligible ? 'Live updates' : 'Demo dataset',
    isProduction: production
  };
}

export function getLiveKeyStatus() {
  return {
    requiredKeysPresent: hasAnyLiveKey(),
    liveModeEnabled: readLiveModeEnv(),
    isProduction: isProductionRuntime()
  };
}
