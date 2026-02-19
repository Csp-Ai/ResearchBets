#!/usr/bin/env node

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });

const requiredExact = ['NEXT_PUBLIC_SUPABASE_URL'];
const anyOfGroups = [['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY']];

const missingExact = requiredExact.filter((key) => {
  const value = process.env[key];
  return typeof value !== 'string' || value.trim().length === 0;
});

const missingGroups = anyOfGroups.filter((group) =>
  group.every((key) => {
    const value = process.env[key];
    return typeof value !== 'string' || value.trim().length === 0;
  })
);

const resolvedKeys = [...requiredExact, ...anyOfGroups.map((group) => group.find((key) => (process.env[key] ?? '').trim()) ?? group[0])];
const allowDummyEnv = process.env.NODE_ENV === 'development' && process.env.ALLOW_DUMMY_ENV === 'true';
const isDummyValue = (value) => typeof value === 'string' && /^dummy([_-]|$)/i.test(value.trim());
const usingDummyValues = resolvedKeys.filter((key) => isDummyValue(process.env[key]));

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

if (usingDummyValues.length > 0 && allowDummyEnv) {
  console.warn(`⚠️ Using dummy values for local development: ${usingDummyValues.join(', ')}`);
}

console.log('✅ Environment check passed. Required Supabase variables are configured.');
