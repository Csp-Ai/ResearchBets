#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const canonicalPath = 'supabase/schema.sql';
const mirrorPath = 'db/supabase/schema.sql';

const canonical = readFileSync(canonicalPath, 'utf8');
const mirror = readFileSync(mirrorPath, 'utf8');

const hash = (value) => createHash('sha256').update(value).digest('hex');
const canonicalHash = hash(canonical);
const mirrorHash = hash(mirror);

if (canonicalHash !== mirrorHash) {
  console.error('❌ Supabase schema drift detected between canonical and mirror baselines.');
  console.error(`- ${canonicalPath}: ${canonicalHash}`);
  console.error(`- ${mirrorPath}: ${mirrorHash}`);
  process.exit(1);
}

console.log('✅ Supabase schema baselines are in sync.');
