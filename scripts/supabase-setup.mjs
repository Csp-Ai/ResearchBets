#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import runNpm from './lib/runNpm.mjs';
import {
  extractSupabaseKeys,
  getSupabaseTokenFromStore,
  normalizeEnvFile,
  parseEnvContent,
  sanitizeProjectRef,
  upsertEnvContent
} from './lib/supabase-setup-helper.mjs';

const RAW_PROJECT_REF = 'gbkjalflukfkixsrjfiq';
const PROJECT_REF = sanitizeProjectRef(RAW_PROJECT_REF);
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const DB_USER = `postgres.${PROJECT_REF}`;
const DB_HOST = 'aws-1-us-east-1.pooler.supabase.com';
const DEFAULT_DATABASE_URL = `postgresql://${DB_USER}:[YOUR-PASSWORD]@${DB_HOST}:6543/postgres?pgbouncer=true`;
const DEFAULT_DIRECT_URL = `postgresql://${DB_USER}:[YOUR-PASSWORD]@${DB_HOST}:5432/postgres`;

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
    if (!allowFailure) throw new Error(stderr || stdout || String(error));
    return { ok: false, stdout, stderr };
  }
}

function assertSupabaseCli() {
  try {
    const version = execFileSync('supabase', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    console.log(`✅ Supabase CLI detected (${version}).`);
  } catch {
    console.error('❌ Supabase CLI not found in PATH.');
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
}

function linkProject() {
  const result = runSupabase(['link', '--project-ref', PROJECT_REF], { allowFailure: true });
  if (!result.ok) {
    console.error('❌ Failed to link Supabase project.');
    console.error(`${result.stdout}\n${result.stderr}`.trim());
    process.exit(1);
  }
  console.log(`✅ Linked Supabase project: ${PROJECT_REF}`);
}

async function fetchApiKeys() {
  const token = getSupabaseTokenFromStore(process.env);
  if (!token) {
    console.error('❌ Missing Supabase access token. Create one in Supabase Dashboard > Account > Access Tokens, set SUPABASE_ACCESS_TOKEN once, then re-run npm run supabase:setup.');
    process.exit(1);
  }

  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    console.error(`❌ Failed to retrieve Supabase API keys (${response.status}). Verify SUPABASE_ACCESS_TOKEN scopes and project access.`);
    process.exit(1);
  }

  const payload = await response.json();
  const keys = extractSupabaseKeys(payload);
  if (!keys.publishableKey) {
    console.error('❌ Supabase Management API returned no publishable/anon key for this project.');
    process.exit(1);
  }

  return keys;
}

function writeEnvFile(filePath, updates) {
  const exists = fs.existsSync(filePath);
  const current = exists ? fs.readFileSync(filePath, 'utf8') : '';
  const next = upsertEnvContent(current, updates);
  const normalized = normalizeEnvFile(next);
  if (!exists || current !== normalized) {
    fs.writeFileSync(filePath, normalized, 'utf8');
    console.log(`✅ Updated ${path.relative(process.cwd(), filePath)}`);
  } else {
    console.log(`✅ ${path.relative(process.cwd(), filePath)} already up to date`);
  }
}

function runSchemaCheckWithAutoPush() {
  const first = spawnSync(process.execPath, ['scripts/supabase-schema-check.mjs'], { encoding: 'utf8', env: process.env });
  if (first.stdout) process.stdout.write(first.stdout);
  if (first.stderr) process.stderr.write(first.stderr);
  if (first.status === 0) return;

  const combined = `${first.stdout || ''}\n${first.stderr || ''}`.toLowerCase();
  if (!combined.includes('missing inspect_public_columns rpc')) {
    process.exit(first.status ?? 1);
  }

  console.log('ℹ️ Missing inspect_public_columns RPC. Running `supabase db push --include-all --yes` automatically...');
  const push = runSupabase(['db', 'push', '--include-all', '--yes'], { allowFailure: true });
  if (!push.ok) {
    console.error(push.stdout || push.stderr);
    console.error('❌ Could not run migrations automatically. If prompted interactively, run `supabase db push --include-all` and type Y.');
    process.exit(1);
  }

  execFileSync(process.execPath, ['-e', 'setTimeout(() => process.exit(0), 30000)'], { stdio: 'ignore' });

  const second = spawnSync(process.execPath, ['scripts/supabase-schema-check.mjs'], { encoding: 'utf8', env: process.env });
  if (second.stdout) process.stdout.write(second.stdout);
  if (second.stderr) process.stderr.write(second.stderr);
  if (second.status !== 0) {
    console.error('❌ Schema check still failing after migration + cache wait. Wait 30-60 seconds and run `npm run supabase:health`.');
    process.exit(second.status ?? 1);
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
  const keys = await fetchApiKeys();

  const canonicalUrl = existing.get('NEXT_PUBLIC_SUPABASE_URL') || PROJECT_URL;
  const updates = {
    NEXT_PUBLIC_SUPABASE_URL: canonicalUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: keys.publishableKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: keys.anonKey || keys.publishableKey,
    EXPO_PUBLIC_SUPABASE_URL: canonicalUrl,
    EXPO_PUBLIC_SUPABASE_KEY: keys.publishableKey,
    SUPABASE_SERVICE_ROLE_KEY: keys.serviceRoleKey || existing.get('SUPABASE_SERVICE_ROLE_KEY') || '[YOUR-SERVICE-ROLE-KEY]',
    DATABASE_URL: existing.get('DATABASE_URL') || DEFAULT_DATABASE_URL,
    DIRECT_URL: existing.get('DIRECT_URL') || DEFAULT_DIRECT_URL
  };

  writeEnvFile(envLocalPath, updates);

  const mobilePath = path.resolve(process.cwd(), 'apps/mobile');
  if (fs.existsSync(mobilePath) && fs.statSync(mobilePath).isDirectory()) {
    writeEnvFile(path.join(mobilePath, '.env'), {
      EXPO_PUBLIC_SUPABASE_URL: canonicalUrl,
      EXPO_PUBLIC_SUPABASE_KEY: keys.publishableKey
    });
  }

  if (!existing.get('DATABASE_URL') || !existing.get('DIRECT_URL')) {
    console.log('ℹ️ DATABASE_URL/DIRECT_URL placeholders were added with [YOUR-PASSWORD]. Update from Supabase Dashboard → Database settings.');
  }

  runNpm(['run', 'env:check']);
  runSchemaCheckWithAutoPush();
  runNpm(['run', 'supabase:health']);

  console.log('✅ Setup complete');
}

await main();
