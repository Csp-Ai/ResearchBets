import { describe, expect, it } from 'vitest';

import { evaluateEnvCheck } from './env-check-helper.mjs';

describe('evaluateEnvCheck', () => {
  it('allows dev dummy bypass when ALLOW_DUMMY_ENV=true', () => {
    const env = { NODE_ENV: 'development', ALLOW_DUMMY_ENV: 'true' };

    const result = evaluateEnvCheck(env);

    expect(result.allowDummyEnv).toBe(true);
    expect(result.missingExact).toEqual([]);
    expect(result.missingGroups).toEqual([]);
  });

  it('requires keys in development without bypass flag', () => {
    const env = { NODE_ENV: 'development' };

    const result = evaluateEnvCheck(env);

    expect(result.allowDummyEnv).toBe(false);
    expect(result.missingExact).toEqual(['NEXT_PUBLIC_SUPABASE_URL']);
    expect(result.missingGroups).toEqual([['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY']]);
  });

  it('never bypasses in production', () => {
    const env = { NODE_ENV: 'production', ALLOW_DUMMY_ENV: 'true' };

    const result = evaluateEnvCheck(env);

    expect(result.allowDummyEnv).toBe(false);
    expect(result.missingExact).toEqual(['NEXT_PUBLIC_SUPABASE_URL']);
    expect(result.missingGroups).toEqual([['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY']]);
  });
});
