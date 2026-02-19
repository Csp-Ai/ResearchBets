#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const canonicalRoot = process.env.CANONICAL_APP_ROOT || 'app';
const alternateRoot = canonicalRoot === 'app' ? 'apps/web/app' : 'app';

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function main() {
  const canonicalPath = path.join(ROOT, canonicalRoot);
  const canonicalStat = await fs.stat(canonicalPath).catch(() => null);
  if (!canonicalStat?.isDirectory()) {
    throw new Error(`Canonical app root does not exist: ${canonicalRoot}`);
  }

  const alternatePath = path.join(ROOT, alternateRoot);
  const alternateStat = await fs.stat(alternatePath).catch(() => null);
  if (!alternateStat?.isDirectory()) {
    console.log(`✅ Canonical app root enforced (${canonicalRoot}); alternate root missing (${alternateRoot}).`);
    return;
  }

  const files = await walk(alternatePath);
  const activePages = files.filter((file) => /\/page\.(tsx?|jsx?)$/.test(file));
  if (activePages.length > 0) {
    console.error(`❌ Found active routes in non-canonical app root: ${alternateRoot}`);
    for (const file of activePages) {
      console.error(` - ${path.relative(ROOT, file).replace(/\\/g, '/')}`);
    }
    process.exit(1);
  }

  console.log(`✅ Canonical app root enforced (${canonicalRoot}); no active routes in ${alternateRoot}.`);
}

main().catch((error) => {
  console.error(`assert-single-app-root failed: ${error.message}`);
  process.exit(1);
});
