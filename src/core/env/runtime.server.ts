import 'server-only';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readBool, resolveWithAliases } from '@/src/core/env/read.server';

export const LIVE_PROVIDER_KEYS = [
  CANONICAL_KEYS.ODDS_API_KEY,
  ...ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY],
  CANONICAL_KEYS.SPORTSDATA_API_KEY,
  ...ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY],
] as const;

const hasProviderKey = (): boolean =>
  Boolean(
    resolveWithAliases(CANONICAL_KEYS.ODDS_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY]) ||
      resolveWithAliases(CANONICAL_KEYS.SPORTSDATA_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY]),
  );

const nodeEnv = process.env.NODE_ENV ?? 'development';
const explicitLiveMode = readBool(CANONICAL_KEYS.LIVE_MODE);
const providersConfigured = hasProviderKey();
const liveModeEnabled = explicitLiveMode ?? (nodeEnv === 'production' ? providersConfigured : false);

export const runtimeFlags = {
  liveModeEnabled,
  providersConfigured,
  demoModeDefault: !liveModeEnabled,
} as const;
