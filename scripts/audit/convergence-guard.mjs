#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'config/convergence.json');
const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

async function walk(target) {
  const stat = await fs.stat(target).catch(() => null);
  if (!stat) return [];
  if (stat.isFile()) return [target];

  const files = [];
  for (const entry of await fs.readdir(target, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(child)));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(child);
  }
  return files;
}

const canonicalFiles = (
  await Promise.all(config.canonicalImportRoots.map((entry) => walk(path.join(root, entry))))
).flat();

const legacySpecifiers = config.legacyModules.flatMap((file) => {
  const withoutExtension = file.replace(/\.(tsx?|jsx?|mjs)$/, '');
  return [file, withoutExtension, `@/${file}`, `@/${withoutExtension}`];
});

const violations = [];
for (const file of canonicalFiles) {
  const source = await fs.readFile(file, 'utf8');
  for (const specifier of legacySpecifiers) {
    if (source.includes(`'${specifier}'`) || source.includes(`"${specifier}"`)) {
      violations.push(`${path.relative(root, file)} imports legacy module ${specifier}`);
    }
  }
}

const journeyRoutes = config.canonicalJourney.map((item) => item.route);
if (new Set(journeyRoutes).size !== journeyRoutes.length) {
  violations.push('Canonical journey contains duplicate routes.');
}

for (const [concern, authority] of Object.entries(config.authorities)) {
  const stat = await fs.stat(path.join(root, authority)).catch(() => null);
  if (!stat?.isFile()) violations.push(`Missing authority for ${concern}: ${authority}`);
}

if (violations.length > 0) {
  console.error('[convergence-guard] Failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  `[convergence-guard] OK — ${config.canonicalJourney.length} stages, ${Object.keys(config.authorities).length} authorities, ${config.legacyModules.length} legacy references`
);
