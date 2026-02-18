#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const file = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of file.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnvLocal();

const missing = requiredVars.filter((name) => {
  const value = process.env[name];
  return typeof value !== 'string' || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error('❌ Environment check failed.');
  console.error('Missing required variables in .env.local:');
  for (const variable of missing) {
    console.error(` - ${variable}`);
  }
  console.error('\nCreate or update .env.local in the repository root, then restart `npm run dev`.');
  process.exit(1);
}

console.log('✅ Environment check passed. Required Supabase variables are present.');
