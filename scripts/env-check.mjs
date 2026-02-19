#!/usr/bin/env node

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });

/** @type {string[]} */
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const missingVars = requiredVars.filter((key) => {
  const value = process.env[key];
  return typeof value !== 'string' || value.trim().length === 0;
});

if (missingVars.length > 0) {
  console.error(`❌ Environment check failed. Missing keys: ${missingVars.join(', ')}`);
  process.exit(1);
}

console.log('✅ Environment check passed.');
process.exit(0);
