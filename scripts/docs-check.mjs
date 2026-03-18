#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readmePath = resolve(process.cwd(), 'README.md');
const routesDocPath = resolve(process.cwd(), 'docs/ROUTES.md');
const cockpitDocPath = resolve(process.cwd(), 'docs/COCKPIT_CANONICAL_ENTRY.md');
const readmeRaw = readFileSync(readmePath, 'utf8');
const routesDocRaw = readFileSync(routesDocPath, 'utf8');
const cockpitDocRaw = readFileSync(cockpitDocPath, 'utf8');
const readme = readmeRaw.toLowerCase();
const routesDoc = routesDocRaw.toLowerCase();
const cockpitDoc = cockpitDocRaw.toLowerCase();
const readmeLineCount = readmeRaw.split(/\r?\n/).length;
const README_MAX_LINES = 280;

const requiredRoutes = ['/', '/today', '/slip', '/stress-test', '/track', '/review'];
const missingRoutes = requiredRoutes.filter((route) => !readme.includes(`\`${route}\``) && !readme.includes(` ${route} `));

const mentionsDemo = readme.includes('demo mode') || readme.includes('demo');
const mentionsLive = readme.includes('live mode') || readme.includes('live');
const canonicalLoopPhrase = 'landing -> today/board -> slip -> stress-test -> track -> review';
const redirectRoutes = ['/cockpit', '/landing', '/research', '/live'];

const failures = [];
if (missingRoutes.length > 0) failures.push(`missing required route mentions: ${missingRoutes.join(', ')}`);
if (!mentionsDemo || !mentionsLive) failures.push('README must mention both demo and live mode behavior');
if (readmeLineCount > README_MAX_LINES) failures.push(`README is ${readmeLineCount} lines (max ${README_MAX_LINES}). Move long-form details into docs/*`);
if (!readme.includes(canonicalLoopPhrase)) failures.push('README must describe the canonical bettor loop in order');
if (!routesDoc.includes(canonicalLoopPhrase)) failures.push('docs/ROUTES.md must describe the canonical bettor loop in order');
if (!cockpitDoc.includes('`/` is the canonical public entry')) failures.push('docs/COCKPIT_CANONICAL_ENTRY.md must state that `/` is the canonical public entry');

for (const route of redirectRoutes) {
  if (!routesDoc.includes(`\`${route}\``)) failures.push(`docs/ROUTES.md must classify redirect-only route ${route}`);
}

if (failures.length > 0) {
  console.error('❌ docs:check failed');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log('✅ docs:check passed');
