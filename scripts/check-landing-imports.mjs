import { readFileSync } from 'node:fs';

const targets = ['app/(home)/page.tsx', 'app/HomeLandingClient.tsx'];
const blocked = [
  'server-only',
  '@/src/core/pipeline/runSlip',
  '@/src/components/research/',
  '@/app/stress-test/',
  '@/src/components/landing/FrontdoorLandingClient'
];

const violations = [];
for (const target of targets) {
  const source = readFileSync(target, 'utf8');
  for (const token of blocked) {
    if (source.includes(token)) violations.push(`${target}: ${token}`);
  }
}

if (violations.length > 0) {
  console.error('[check:landing-imports] blocked imports detected:');
  violations.forEach((entry) => console.error(` - ${entry}`));
  process.exit(1);
}

console.log('[check:landing-imports] ok');
