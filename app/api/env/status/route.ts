import 'server-only';

import { NextResponse } from 'next/server';

import { runtimeFlags } from '@/src/core/env/runtime.server';
import { resolveRuntimeMode } from '@/src/core/live/modeResolver.server';

const parseBoolean = (value: string | undefined): boolean | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
};

const hasValue = (name: string): boolean => Boolean(process.env[name]?.trim());

export async function GET() {
  const liveModeEnvRaw = process.env.LIVE_MODE ?? null;
  const resolvedMode = resolveRuntimeMode();

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    vercelEnv: process.env.VERCEL_ENV ?? null,
    liveModeEnvRaw,
    liveModeParsed: parseBoolean(process.env.LIVE_MODE),
    runtimeFlags,
    resolvedMode: {
      mode: resolvedMode.mode,
      reason: resolvedMode.reason,
    },
    keysPresent: {
      THEODDSAPI_KEY: hasValue('THEODDSAPI_KEY'),
      ODDS_API_KEY: hasValue('ODDS_API_KEY'),
      SPORTSDATA_API_KEY: hasValue('SPORTSDATA_API_KEY'),
      SPORTSDATAIO_API_KEY: hasValue('SPORTSDATAIO_API_KEY'),
      NEXT_PUBLIC_SUPABASE_URL: hasValue('NEXT_PUBLIC_SUPABASE_URL'),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasValue('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    },
  });
}
