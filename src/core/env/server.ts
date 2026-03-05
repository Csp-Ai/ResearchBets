import 'server-only';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readBool, readString, resolveWithAliases } from '@/src/core/env/read.server';

type ServerEnv = {
  nodeEnv: 'development' | 'test' | 'production';
  vercel: string | null;
  liveMode: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseServiceRoleKey: string | null;
  sportsDataApiKey: string | null;
  oddsApiKey: string | null;
  cronSecret: string | null;
  missing: string[];
};

export const getServerEnv = (): ServerEnv => {
  const nodeEnv = (process.env.NODE_ENV as ServerEnv['nodeEnv'] | undefined) ?? 'development';
  const env: ServerEnv = {
    nodeEnv,
    vercel: readString('VERCEL') ?? null,
    liveMode: (() => {
      const explicitLiveMode = readBool(CANONICAL_KEYS.LIVE_MODE);
      if (explicitLiveMode !== null) return explicitLiveMode;
      const hasAnyLiveKey = Boolean(
        resolveWithAliases(CANONICAL_KEYS.ODDS_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY]) ||
          resolveWithAliases(CANONICAL_KEYS.SPORTSDATA_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY]),
      );
      return nodeEnv === 'production' ? hasAnyLiveKey : false;
    })(),
    supabaseUrl: readString(CANONICAL_KEYS.NEXT_PUBLIC_SUPABASE_URL) ?? null,
    supabaseAnonKey: readString(CANONICAL_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY) ?? null,
    supabaseServiceRoleKey: readString(CANONICAL_KEYS.SUPABASE_SERVICE_ROLE_KEY) ?? null,
    sportsDataApiKey:
      resolveWithAliases(CANONICAL_KEYS.SPORTSDATA_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY]) ?? null,
    oddsApiKey: resolveWithAliases(CANONICAL_KEYS.ODDS_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY]) ?? null,
    cronSecret: readString(CANONICAL_KEYS.CRON_SECRET) ?? null,
    missing: [],
  };

  const required = [
    [CANONICAL_KEYS.NEXT_PUBLIC_SUPABASE_URL, env.supabaseUrl],
    [CANONICAL_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY, env.supabaseAnonKey],
    [CANONICAL_KEYS.SUPABASE_SERVICE_ROLE_KEY, env.supabaseServiceRoleKey],
  ] as const;

  env.missing = required.filter((entry) => !entry[1]).map((entry) => entry[0]);

  if (nodeEnv === 'development' && env.missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${env.missing.join(', ')}. Copy .env.example to .env.local and fill required values.`,
    );
  }

  return env;
};
