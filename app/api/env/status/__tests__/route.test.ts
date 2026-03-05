import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type EnvSnapshot = Record<string, string | undefined>;

const ENV_KEYS = [
  'NODE_ENV',
  'VERCEL_ENV',
  'LIVE_MODE',
  'THEODDSAPI_KEY',
  'ODDS_API_KEY',
  'SPORTSDATA_API_KEY',
  'SPORTSDATAIO_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const snapshotEnv = (): EnvSnapshot =>
  ENV_KEYS.reduce<EnvSnapshot>((acc, key) => {
    acc[key] = process.env[key];
    return acc;
  }, {});

const restoreEnv = (snapshot: EnvSnapshot) => {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (typeof value === 'string') (process.env as Record<string, string | undefined>)[key] = value;
    else delete process.env[key];
  }
};

describe('/api/env/status GET', () => {
  let envSnapshot: EnvSnapshot;

  beforeEach(() => {
    envSnapshot = snapshotEnv();
    vi.resetModules();
    for (const key of ENV_KEYS) delete process.env[key];
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
    vi.resetModules();
  });

  it('parses LIVE_MODE=true and reports key booleans without values', async () => {
    process.env.LIVE_MODE = 'true';
    process.env.ODDS_API_KEY = 'odds-secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';

    const { GET } = await import('../route');
    const response = await GET();
    const payload = await response.json();

    expect(payload.liveModeEnvRaw).toBe('true');
    expect(payload.liveModeParsed).toBe(true);
    expect(payload.runtimeFlags.liveModeEnabled).toBe(true);
    expect(payload.runtimeFlags.providersConfigured).toBe(true);
    expect(payload.runtimeFlags.demoModeDefault).toBe(false);
    expect(payload.resolvedMode.mode).toBe('live');
    expect(payload.resolvedMode.reason).toBe('live_ok');
    expect(payload.keysPresent.ODDS_API_KEY).toBe(true);
    expect(payload.keysPresent.NEXT_PUBLIC_SUPABASE_URL).toBe(true);
    expect(payload.keysPresent.SPORTSDATA_API_KEY).toBe(false);
  });

  it('parses LIVE_MODE=false and keeps demo defaults', async () => {
    process.env.LIVE_MODE = 'false';
    process.env.ODDS_API_KEY = 'odds-secret';

    const { GET } = await import('../route');
    const response = await GET();
    const payload = await response.json();

    expect(payload.liveModeParsed).toBe(false);
    expect(payload.runtimeFlags.liveModeEnabled).toBe(false);
    expect(payload.runtimeFlags.providersConfigured).toBe(true);
    expect(payload.runtimeFlags.demoModeDefault).toBe(true);
    expect(payload.resolvedMode.mode).toBe('demo');
    expect(payload.resolvedMode.reason).toBe('live_mode_disabled');
    expect(payload.keysPresent.ODDS_API_KEY).toBe(true);
  });

  it('treats invalid LIVE_MODE as null parse and falls back to development-safe demo mode', async () => {
    process.env.LIVE_MODE = 'not-a-bool';

    const { GET } = await import('../route');
    const response = await GET();
    const payload = await response.json();

    expect(payload.liveModeEnvRaw).toBe('not-a-bool');
    expect(payload.liveModeParsed).toBeNull();
    expect(payload.runtimeFlags.liveModeEnabled).toBe(false);
    expect(payload.runtimeFlags.providersConfigured).toBe(false);
    expect(payload.runtimeFlags.demoModeDefault).toBe(true);
    expect(payload.resolvedMode.mode).toBe('demo');
    expect(payload.resolvedMode.reason).toBe('live_mode_disabled');
  });
});
