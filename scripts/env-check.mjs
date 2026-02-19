#!/usr/bin/env node

import dotenv from 'dotenv';

import { evaluateEnvCheck } from './lib/env-check-helper.mjs';

dotenv.config({ path: '.env.local', quiet: true });

const { allowDummyEnv, missingExact, missingGroups, usingDummyValues } = evaluateEnvCheck(process.env);

if (missingExact.length > 0 || missingGroups.length > 0) {
  const missing = [...missingExact, ...missingGroups.map((group) => `[one of: ${group.join(' | ')}]`)];
  console.error(`❌ Environment check failed. Missing keys: ${missing.join(', ')}`);
  console.error('Copy/paste template:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>');
  console.error('# optional alias: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<publishable-key>');
  process.exit(1);
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
