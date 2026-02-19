#!/usr/bin/env node

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

const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const tables = Object.keys(REQUIRED_SCHEMA);
const { data, error } = await client
  .from('information_schema.columns')
  .select('table_name,column_name')
  .eq('table_schema', 'public')
  .in('table_name', tables);

if (error) {
  console.error('❌ Failed to inspect Supabase schema:', error.message);
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

  for (const line of getFixInstructions()) {
    console.error(line);
  }

  process.exit(1);
}

for (const table of tables) {
  console.log(`✅ public.${table} is aligned (${REQUIRED_SCHEMA[table].length} required columns present).`);
}

console.log('✅ Supabase schema check passed.');
