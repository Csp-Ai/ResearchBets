#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';

import runNpm from './lib/runNpm.mjs';
import { extractSupabaseKeys, parseEnvContent, sanitizeProjectRef, upsertEnvContent } from './lib/supabase-setup-helper.mjs';

const RAW_PROJECT_REF = 'gbkjalflukfkixsrjfiq';
const PROJECT_REF = sanitizeProjectRef(RAW_PROJECT_REF);
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const DB_USER = `postgres.${PROJECT_REF}`;
const DB_HOST = 'aws-1-us-east-1.pooler.supabase.com';
const DEFAULT_DATABASE_URL = `postgresql://${DB_USER}:[YOUR-PASSWORD]@${DB_HOST}:6543/postgres?pgbouncer=true`;
const DEFAULT_DIRECT_URL = `postgresql://${DB_USER}:[YOUR-PASSWORD]@${DB_HOST}:5432/postgres`;
const isCi = process.argv.includes('--ci');

function runSupabase(args, { allowFailure = false } = {}) {
  try {
    const output = execFileSync('supabase', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { ok: true, stdout: output, stderr: '' };
  } catch (error) {
    const stderr = error?.stderr?.toString?.() ?? '';
    const stdout = error?.stdout?.toString?.() ?? '';
    if (!allowFailure) {
      throw new Error(stderr || stdout || String(error));
    }
    return { ok: false, stdout, stderr };
  }
}

function assertSupabaseCli() {
  try {
    const version = execFileSync('supabase', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    console.log(`✅ Supabase CLI detected (${version}).`);
  } catch {
    const platform = process.platform;
    console.error('❌ Supabase CLI not found in PATH.');
    if (platform === 'win32') {
      console.error('Install on Windows (PowerShell): scoop install supabase');
    } else if (platform === 'darwin') {
      console.error('Install on macOS: brew install supabase/tap/supabase');
    } else {
      console.error('Install on Linux: https://supabase.com/docs/guides/cli/getting-started');
    }
    process.exit(1);
  }
}

function assertSupabaseLogin() {
  const result = runSupabase(['projects', 'list', '-o', 'json'], { allowFailure: true });
  const combined = `${result.stdout}\n${result.stderr}`.toLowerCase();
  if (!result.ok && (combined.includes('access token') || combined.includes('not logged in') || combined.includes('unauthorized'))) {
    console.error('❌ Supabase CLI is not authenticated. Run: supabase login');
    process.exit(1);
  }

  if (!result.ok) {
    console.warn('⚠️ Could not confirm login from `supabase projects list`; continuing with link attempt.');
  } else {
    console.log('✅ Supabase CLI authentication looks good.');
  }
}

function linkProject() {
  const first = runSupabase(['link', '--project-ref', RAW_PROJECT_REF], { allowFailure: true });
  if (first.ok) {
    console.log(`✅ Linked Supabase project: ${PROJECT_REF}`);
    return;
  }

  const allOutput = `${first.stdout}\n${first.stderr}`;
  if (!allOutput.toLowerCase().includes('invalid project ref format')) {
    console.error('❌ Failed to link Supabase project.');
    console.error(allOutput.trim());
    process.exit(1);
  }

  const sanitized = sanitizeProjectRef(RAW_PROJECT_REF);
  if (sanitized === RAW_PROJECT_REF) {
    console.error('❌ Failed to link Supabase project due to project ref format.');
    console.error('Run: supabase projects list');
    console.error('Copy the REFERENCE ID column value.');
    console.error('Avoid copying Project ID from dashboard if it differs.');
    process.exit(1);
  }

  const retry = runSupabase(['link', '--project-ref', sanitized], { allowFailure: true });
  if (retry.ok) {
    console.log(`✅ Linked Supabase project with sanitized ref: ${sanitized}`);
    return;
  }

  console.error('❌ Failed to link Supabase project after sanitizing project ref.');
  console.error('Run: supabase projects list');
  console.error('Copy the REFERENCE ID column value.');
  console.error('Avoid copying Project ID from dashboard if it differs.');
  process.exit(1);
}

function looksLikeJwt(value) {
  return typeof value === 'string' && value.split('.').length >= 3;
}

async function requestKey(label, { validator, errorMessage }) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const answer = (await rl.question(`${label}: `)).trim();
      if (validator(answer)) return answer;
      console.error(errorMessage);
    }
  } finally {
    rl.close();
  }
}

function tryFetchKeysFromCli() {
  const apiKeysResult = runSupabase(['projects', 'api-keys', '--project-ref', PROJECT_REF, '-o', 'json'], { allowFailure: true });
  if (apiKeysResult.ok) {
    try {
      const parsed = JSON.parse(apiKeysResult.stdout);
      return extractSupabaseKeys(parsed);
    } catch {
      console.warn('⚠️ Could not parse output from `supabase projects api-keys -o json`.');
    }
  }

  const projectsExperimental = runSupabase(['projects', 'list', '--experimental', '-o', 'json'], { allowFailure: true });
  if (projectsExperimental.ok) {
    try {
      const parsed = JSON.parse(projectsExperimental.stdout);
      return extractSupabaseKeys(parsed);
    } catch {
      console.warn('⚠️ Could not parse output from `supabase projects list --experimental -o json`.');
    }
  }

  return {};
}

async function resolveKeys(existingValues) {
  const fromCli = tryFetchKeysFromCli();
  const publishableKey = fromCli.publishableKey ?? existingValues.get('EXPO_PUBLIC_SUPABASE_KEY') ?? '';
  const anonKey = fromCli.anonKey ?? existingValues.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = fromCli.serviceRoleKey ?? existingValues.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (publishableKey && anonKey && serviceRoleKey) {
    console.log('✅ Retrieved Supabase API keys from local env and/or CLI.');
    return { publishableKey, anonKey, serviceRoleKey };
  }

  if (isCi) {
    console.error('❌ Missing one or more required Supabase keys in CI mode.');
    console.error('Populate .env.local (or environment variables) with EXPO/NEXT_PUBLIC/SUPABASE keys before running supabase:setup:ci.');
    process.exit(1);
  }

  console.log('ℹ️ Could not retrieve all keys via CLI; please paste them once to persist locally.');

  return {
    publishableKey:
      publishableKey ||
      (await requestKey('Enter EXPO_PUBLIC_SUPABASE_KEY (publishable, starts with sb_)', {
        validator: (v) => v.length > 0 && v.startsWith('sb_'),
        errorMessage: 'Invalid publishable key. It must be non-empty and start with "sb_".'
      })),
    anonKey:
      anonKey ||
      (await requestKey('Enter NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy anon JWT is OK)', {
        validator: (v) => v.length > 0 && looksLikeJwt(v),
        errorMessage: 'Invalid anon key. Expected JWT-like format (three dot-separated parts).'
      })),
    serviceRoleKey:
      serviceRoleKey ||
      (await requestKey('Enter SUPABASE_SERVICE_ROLE_KEY (server-only JWT)', {
        validator: (v) => v.length > 0 && looksLikeJwt(v),
        errorMessage: 'Invalid service role key. Expected JWT-like format (three dot-separated parts).'
      }))
  };
}

function writeEnvFile(filePath, updates) {
  const exists = fs.existsSync(filePath);
  const current = exists ? fs.readFileSync(filePath, 'utf8') : '';
  const next = upsertEnvContent(current, updates);
  if (!exists || current !== next) {
    fs.writeFileSync(filePath, next, 'utf8');
    console.log(`✅ Updated ${path.relative(process.cwd(), filePath)}`);
  } else {
    console.log(`✅ ${path.relative(process.cwd(), filePath)} already up to date`);
  }
}

async function main() {
  console.log('🔧 Starting Supabase setup...');
  assertSupabaseCli();
  assertSupabaseLogin();
  linkProject();

  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  const currentEnv = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : '';
  const existing = parseEnvContent(currentEnv);
  const keys = await resolveKeys(existing);

  const updates = {
    NEXT_PUBLIC_SUPABASE_URL: PROJECT_URL,
    EXPO_PUBLIC_SUPABASE_URL: PROJECT_URL,
    EXPO_PUBLIC_SUPABASE_KEY: keys.publishableKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: keys.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: keys.serviceRoleKey,
    DATABASE_URL: existing.get('DATABASE_URL') || DEFAULT_DATABASE_URL,
    DIRECT_URL: existing.get('DIRECT_URL') || DEFAULT_DIRECT_URL
  };

  writeEnvFile(envLocalPath, updates);

  const mobilePath = path.resolve(process.cwd(), 'apps/mobile');
  if (fs.existsSync(mobilePath) && fs.statSync(mobilePath).isDirectory()) {
    writeEnvFile(path.join(mobilePath, '.env'), {
      EXPO_PUBLIC_SUPABASE_URL: PROJECT_URL,
      EXPO_PUBLIC_SUPABASE_KEY: keys.publishableKey
    });
  } else {
    console.log('ℹ️ apps/mobile not found; EXPO_ keys were written to .env.local only.');
  }

  runNpm(['run', 'env:check']);
  runNpm(['run', 'supabase:health']);

  console.log('✅ Setup complete');
  console.log('Next: start the app with `npm run dev`.');
}

await main();
