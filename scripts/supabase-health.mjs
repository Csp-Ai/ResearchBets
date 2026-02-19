#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

import runNpm from './lib/runNpm.mjs';

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const file = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of file.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function runSchemaCheckWithGuidance() {
  const result = spawnSync(process.execPath, ['scripts/supabase-schema-check.mjs'], {
    env: process.env,
    encoding: 'utf8'
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status === 0) return;

  const combined = `${result.stdout || ''}\n${result.stderr || ''}`.toLowerCase();
  if (combined.includes('missing inspect_public_columns rpc')) {
    console.error('❌ Schema check failed: missing RPC. Run: supabase db push');
  } else if (combined.includes('postgrest schema cache may be stale')) {
    console.error('❌ Schema check failed after migrations. Wait 30-60s then retry.');
  }

  process.exit(result.status ?? 1);
}

loadDotEnvLocal();

runNpm(['run', 'env:check']);
runSchemaCheckWithGuidance();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for health query.');
  process.exit(1);
}

const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const { error } = await client.from('runtime_sessions').select('session_id').limit(1);

if (error) {
  console.error('❌ Supabase minimal health query failed:', error.message);
  process.exit(1);
}

console.log('✅ Supabase health check passed (env + schema + query).');
