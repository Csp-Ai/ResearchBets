#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

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

loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL.');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const required = {
  runtime_sessions: ['session_id', 'user_id', 'last_seen_at'],
  events_analytics: [
    'event_name',
    'timestamp',
    'request_id',
    'trace_id',
    'run_id',
    'session_id',
    'user_id',
    'agent_id',
    'model_version',
    'confidence',
    'assumptions',
    'properties'
  ],
  bets: [
    'id',
    'user_id',
    'session_id',
    'snapshot_id',
    'trace_id',
    'run_id',
    'selection',
    'game_id',
    'market_type',
    'line',
    'book',
    'odds_format',
    'price',
    'odds',
    'recommended_id',
    'followed_ai',
    'placed_line',
    'placed_price',
    'placed_odds',
    'closing_line',
    'closing_price',
    'clv_line',
    'clv_price',
    'stake',
    'status',
    'outcome',
    'settled_profit',
    'confidence',
    'created_at',
    'settled_at',
    'resolution_reason',
    'source_url',
    'source_domain'
  ]
};

const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

const tables = Object.keys(required);
const { data, error } = await client
  .from('information_schema.columns')
  .select('table_name,column_name')
  .eq('table_schema', 'public')
  .in('table_name', tables);

if (error) {
  console.error('❌ Failed to inspect Supabase schema:', error.message);
  process.exit(1);
}

const observed = new Map();
for (const row of data ?? []) {
  const table = String(row.table_name);
  const column = String(row.column_name);
  if (!observed.has(table)) observed.set(table, new Set());
  observed.get(table).add(column);
}

let hasMismatch = false;
for (const table of tables) {
  const found = observed.get(table);
  if (!found) {
    hasMismatch = true;
    console.error(`❌ Missing table: public.${table}`);
    continue;
  }

  const missingColumns = required[table].filter((column) => !found.has(column));
  if (missingColumns.length > 0) {
    hasMismatch = true;
    console.error(`❌ Missing columns in public.${table}: ${missingColumns.join(', ')}`);
  } else {
    console.log(`✅ public.${table} is aligned (${required[table].length} required columns present).`);
  }
}

if (hasMismatch) {
  process.exit(1);
}

console.log('✅ Supabase schema check passed.');
