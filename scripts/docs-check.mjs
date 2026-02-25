#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readmePath = resolve(process.cwd(), 'README.md');
const readme = readFileSync(readmePath, 'utf8').toLowerCase();

const requiredRoutes = ['/', '/slip', '/stress-test', '/control'];
const missingRoutes = requiredRoutes.filter((route) => !readme.includes(`\`${route}\``) && !readme.includes(` ${route} `));

const mentionsDemo = readme.includes('demo mode') || readme.includes('demo');
const mentionsLive = readme.includes('live mode') || readme.includes('live');

const failures = [];
if (missingRoutes.length > 0) failures.push(`missing required route mentions: ${missingRoutes.join(', ')}`);
if (!mentionsDemo || !mentionsLive) failures.push('README must mention both demo and live mode behavior');

if (failures.length > 0) {
  console.error('❌ docs:check failed');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log('✅ docs:check passed');
