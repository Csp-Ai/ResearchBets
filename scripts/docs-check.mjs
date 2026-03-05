#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readmePath = resolve(process.cwd(), 'README.md');
const readmeRaw = readFileSync(readmePath, 'utf8');
const readme = readmeRaw.toLowerCase();
const readmeLineCount = readmeRaw.split(/\r?\n/).length;
const README_MAX_LINES = 280;

const requiredRoutes = ['/', '/slip', '/stress-test', '/control'];
const missingRoutes = requiredRoutes.filter((route) => !readme.includes(`\`${route}\``) && !readme.includes(` ${route} `));

const mentionsDemo = readme.includes('demo mode') || readme.includes('demo');
const mentionsLive = readme.includes('live mode') || readme.includes('live');

const failures = [];
if (missingRoutes.length > 0) failures.push(`missing required route mentions: ${missingRoutes.join(', ')}`);
if (!mentionsDemo || !mentionsLive) failures.push('README must mention both demo and live mode behavior');
if (readmeLineCount > README_MAX_LINES) failures.push(`README is ${readmeLineCount} lines (max ${README_MAX_LINES}). Move long-form details into docs/*`);

if (failures.length > 0) {
  console.error('❌ docs:check failed');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log('✅ docs:check passed');
