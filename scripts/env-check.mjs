#!/usr/bin/env node

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });

/** @type {string[]} */
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const missingVars = requiredVars.filter((key) => {
  const value = process.env[key];
  return typeof value !== 'string' || value.trim().length === 0;
});

const allowDummyEnv = process.env.NODE_ENV === 'development' && process.env.ALLOW_DUMMY_ENV === 'true';
const isDummyValue = (value) => typeof value === 'string' && /^dummy([_-]|$)/i.test(value.trim());
const usingDummyValues = requiredVars.filter((key) => isDummyValue(process.env[key]));

if (missingVars.length > 0) {
  console.error(`❌ Environment check failed. Missing keys: ${missingVars.join(', ')}`);
  console.error('   Copy .env.local.example to .env.local and set your local Supabase values.');
  process.exit(1);
}

if (usingDummyValues.length > 0 && !allowDummyEnv) {
  console.error(`❌ Environment check failed. Dummy values are not allowed for: ${usingDummyValues.join(', ')}`);
  console.error('   Copy .env.local.example to .env.local, then replace placeholders with real Supabase values.');
  console.error('   To bypass only for local development, set ALLOW_DUMMY_ENV=true and NODE_ENV=development.');
  process.exit(1);
}

if (usingDummyValues.length > 0 && allowDummyEnv) {
  console.warn(`⚠️ Using dummy values for local development: ${usingDummyValues.join(', ')}`);
}

console.log('✅ Environment check passed.');
process.exit(0);
