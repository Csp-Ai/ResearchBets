#!/usr/bin/env node

import dotenv from 'dotenv';

import { evaluateEnvCheck } from './lib/env-check-helper.mjs';

dotenv.config({ path: '.env.local', quiet: true });

const isCI = Boolean(process.env.CI);
const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const liveMode = (process.env.LIVE_MODE ?? '').toLowerCase();
const liveEnabled = liveMode === 'true' || liveMode === '1';
const allowOffline = ['1', 'true', 'yes'].includes((process.env.DEV_ALLOW_OFFLINE ?? '').toLowerCase());

const strictMode = isCI || isProd || liveEnabled;
const relaxedMode = !strictMode;

const { allowDummyEnv, missingExact, missingGroups, usingDummyValues } = evaluateEnvCheck(process.env);

if (missingExact.length > 0 || missingGroups.length > 0) {
  const missing = [...missingExact, ...missingGroups.map((group) => `[one of: ${group.join(' | ')}]`)];
  if (strictMode) {
    console.error(`❌ Environment check failed. Missing keys: ${missing.join(', ')}`);
    console.error('Copy/paste template for full mode:');
    console.error('NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>');
    console.error('# optional alias: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<publishable-key>');
    process.exit(1);
  }

  if (relaxedMode) {
    console.warn('⚠️  Environment check warning (offline/demo mode enabled).');
    console.warn(`Missing keys: ${missing.join(', ')}`);
    if (allowOffline) {
      console.warn('DEV_ALLOW_OFFLINE is set; continuing without Supabase public keys.');
    }
    console.warn('Supabase-backed persistence/community/research features will be disabled or degraded.');
    console.warn('To enable full mode, set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    console.warn('Or explicitly run full mode with LIVE_MODE=true and real keys configured.');
    console.warn('Copy/paste template for full mode:');
    console.warn('NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co');
    console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>');
    console.warn('# optional alias: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<publishable-key>');
    process.exit(0);
  }
}

if (usingDummyValues.length > 0 && !allowDummyEnv) {
  console.error(`❌ Environment check failed. Dummy values are not allowed for: ${usingDummyValues.join(', ')}`);
  console.error('Set real Supabase values in .env.local.');
  console.error('Temporary local bypass only: ALLOW_DUMMY_ENV=true NODE_ENV=development npm run env:check');
  process.exit(1);
}

if (allowDummyEnv) {
  console.warn('⚠️ Using dummy env in dev (ALLOW_DUMMY_ENV=true). Live Supabase disabled.');
}

console.log('✅ Environment check passed. Required Supabase variables are configured.');
