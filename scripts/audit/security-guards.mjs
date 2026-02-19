#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function gitFiles() {
  const output = execSync('git ls-files', { encoding: 'utf8' });
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

async function main() {
  const files = gitFiles();

  const trackedEnv = files.filter(
    (file) => {
      const base = path.basename(file);
      if (!base.startsWith('.env')) return false;
      return !['.env.example', '.env.local.example'].includes(base);
    }
  );

  if (trackedEnv.length > 0) {
    console.error('❌ Tracked env files are not allowed:');
    trackedEnv.forEach((file) => console.error(` - ${file}`));
    process.exit(1);
  }

  const candidateClientFiles = files.filter((file) => /\.(tsx?|jsx?)$/.test(file));
  const offenders = [];
  for (const file of candidateClientFiles) {
    const abs = path.join(ROOT, file);
    const source = await fs.readFile(abs, 'utf8').catch(() => '');
    const trimmed = source.trimStart();
    const isClient = trimmed.startsWith("'use client'") || trimmed.startsWith('"use client"');
    if (isClient && source.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      offenders.push(file);
    }
  }

  if (offenders.length > 0) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY reference found in client component(s):');
    offenders.forEach((file) => console.error(` - ${file}`));
    process.exit(1);
  }

  console.log('✅ Security guards passed (env tracking + client service-role checks).');
}

main().catch((error) => {
  console.error(`security-guards failed: ${error.message}`);
  process.exit(1);
});
