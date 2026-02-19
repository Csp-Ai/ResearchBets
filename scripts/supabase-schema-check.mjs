#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

import {
  buildObservedMap,
  findSchemaMismatches,
  getFixInstructions,
  REQUIRED_SCHEMA
} from './lib/supabase-schema-check-helper.mjs';

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

function parseProjectRef(rawUrl) {
  try {
    const host = new URL(rawUrl).host;
    const [projectRef] = host.split('.');
    return projectRef?.trim() ? projectRef : null;
  } catch {
    return null;
  }
}

function readLinkedProjectRef() {
  try {
    const output = execFileSync('supabase', ['status', '-o', 'json'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8'
    });
    const parsed = JSON.parse(output);
    const linkedRef = parsed?.linked_project_ref;
    return typeof linkedRef === 'string' && linkedRef.trim().length > 0 ? linkedRef.trim() : null;
  } catch {
    return null;
  }
}

function shouldTreatAsLocalSupabase() {
  return process.env.SUPABASE_LOCAL === 'true' || Boolean(process.env.SUPABASE_DB_URL);
}

function isConnectivityError(error) {
  const message = `${String(error?.message ?? '')} ${String(error?.details ?? '')}`.toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('enotfound') ||
    message.includes('eai_again') ||
    message.includes('getaddrinfo') ||
    message.includes('network') ||
    message.includes('connect') ||
    message.includes('timeout')
  );
}

loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const derivedProjectRef = url ? parseProjectRef(url) : null;
const linkedProjectRef = readLinkedProjectRef();
const isLocalSupabase = shouldTreatAsLocalSupabase();

if (!url) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL.');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

if (derivedProjectRef) {
  console.log(`ℹ️ NEXT_PUBLIC_SUPABASE_URL project ref: ${derivedProjectRef}`);
}
if (linkedProjectRef) {
  console.log(`ℹ️ supabase status linked project ref: ${linkedProjectRef}`);
}
if (derivedProjectRef && linkedProjectRef && derivedProjectRef !== linkedProjectRef) {
  console.error('❌ Project mismatch: linked Supabase project differs from NEXT_PUBLIC_SUPABASE_URL.');
  console.error('   Run `supabase link` and link the same project shown in NEXT_PUBLIC_SUPABASE_URL.');
  process.exit(1);
}

const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const tables = Object.keys(REQUIRED_SCHEMA);
const { data, error } = await client
  .from('information_schema.columns')
  .select('table_name,column_name')
  .eq('table_schema', 'public')
  .in('table_name', tables);

if (error) {
  console.error('❌ Failed to inspect Supabase schema:', error.message);

  if (isConnectivityError(error)) {
    console.error(
      'This is connectivity / missing project context. Run `supabase link` and confirm NEXT_PUBLIC_SUPABASE_URL matches the linked project.'
    );
  }

  if (isLocalSupabase) {
    console.error('Local Supabase detected (SUPABASE_DB_URL or SUPABASE_LOCAL=true).');
    console.error('If local services are stale, run `supabase status` then `supabase stop && supabase start`.');
  }

  process.exit(1);
}

const observed = buildObservedMap(data);
const issues = findSchemaMismatches(REQUIRED_SCHEMA, observed);

if (issues.length > 0) {
  for (const issue of issues) {
    if (issue.type === 'missing_table') {
      console.error(`❌ Missing table: public.${issue.table}`);
      continue;
    }

    console.error(`❌ Missing columns in public.${issue.table}: ${issue.missingColumns.join(', ')}`);
  }

  for (const line of getFixInstructions({ isLocalSupabase })) {
    console.error(line);
  }

  if (isLocalSupabase) {
    try {
      execFileSync('supabase', ['status'], { stdio: 'inherit' });
    } catch {
      console.error('ℹ️ Unable to run `supabase status` automatically. Ensure Supabase CLI is installed.');
    }
  }

  process.exit(1);
}

for (const table of tables) {
  console.log(`✅ public.${table} is aligned (${REQUIRED_SCHEMA[table].length} required columns present).`);
}

console.log('✅ Supabase schema check passed.');
