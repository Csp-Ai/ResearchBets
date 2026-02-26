import 'server-only';

const LIVE_PROVIDER_KEYS = ['THEODDSAPI_KEY', 'ODDS_API_KEY', 'SPORTSDATA_API_KEY', 'SPORTSDATAIO_API_KEY'] as const;

const readBoolean = (value: string | undefined): boolean | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
};

const hasProviderKey = (): boolean => LIVE_PROVIDER_KEYS.some((name) => Boolean(process.env[name]?.trim()));

const nodeEnv = process.env.NODE_ENV ?? 'development';
const explicitLiveMode = readBoolean(process.env.LIVE_MODE);
const providersConfigured = hasProviderKey();
const liveModeEnabled = explicitLiveMode ?? (nodeEnv === 'production' ? providersConfigured : false);

export const runtimeFlags = {
  liveModeEnabled,
  providersConfigured,
  demoModeDefault: !liveModeEnabled,
} as const;
