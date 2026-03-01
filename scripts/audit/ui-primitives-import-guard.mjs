import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const guardedFiles = [
  'src/components/ui/button.tsx',
  'src/components/ui/Badge.tsx',
  'src/components/ui/CardSurface.tsx',
  'src/components/ui/chip.tsx',
  'src/components/ui/surface.tsx',
];

const bannedImportPatterns = [
  /from\s+['"]@radix-ui\//,
  /from\s+['"]framer-motion['"]/, // heavy client-only runtime in server-safe primitives
  /from\s+['"]@\/src\/core\/contracts\//,
  /from\s+['"]@\/src\/core\/persistence\//,
  /from\s+['"]@\/src\/core\/telemetry\//,
  /from\s+['"]zod['"]/
];

const violations = [];

for (const relativePath of guardedFiles) {
  const fullPath = resolve(root, relativePath);
  const text = readFileSync(fullPath, 'utf8');

  if (/^['"]use client['"];?/m.test(text)) {
    violations.push(`${relativePath}: must remain server-safe (remove 'use client').`);
  }

  for (const pattern of bannedImportPatterns) {
    if (pattern.test(text)) {
      violations.push(`${relativePath}: banned import pattern ${pattern}`);
    }
  }
}

if (violations.length > 0) {
  console.error('[audit:ui-primitives-import-guard] failed');
  for (const line of violations) console.error(` - ${line}`);
  process.exit(1);
}

console.log('[audit:ui-primitives-import-guard] ok');
