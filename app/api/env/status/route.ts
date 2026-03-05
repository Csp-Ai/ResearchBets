import 'server-only';

import { NextResponse } from 'next/server';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readBool, readString } from '@/src/core/env/read.server';
import { runtimeFlags } from '@/src/core/env/runtime.server';
import { resolveRuntimeMode } from '@/src/core/live/modeResolver.server';

const hasValue = (name: string): boolean => Boolean(readString(name));

export async function GET() {
  const liveModeEnvRaw = readString(CANONICAL_KEYS.LIVE_MODE) ?? null;
  const resolvedMode = resolveRuntimeMode();

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    vercelEnv: process.env.VERCEL_ENV ?? null,
    liveModeEnvRaw,
    liveModeParsed: readBool(CANONICAL_KEYS.LIVE_MODE),
    runtimeFlags,
    resolvedMode: {
      mode: resolvedMode.mode,
      reason: resolvedMode.reason,
    },
    keysPresent: {
      THEODDSAPI_KEY: hasValue(ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY][0]),
      ODDS_API_KEY: hasValue(CANONICAL_KEYS.ODDS_API_KEY),
      SPORTSDATA_API_KEY: hasValue(CANONICAL_KEYS.SPORTSDATA_API_KEY),
      SPORTSDATAIO_API_KEY: hasValue(ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY][0]),
      NEXT_PUBLIC_SUPABASE_URL: hasValue(CANONICAL_KEYS.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasValue(CANONICAL_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
  });
}
