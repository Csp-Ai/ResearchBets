import { readFileSync } from 'node:fs';

const target = 'src/components/landing/HomeLandingPage.tsx';
const source = readFileSync(target, 'utf8');

const blocked = [
  'server-only',
  '@/src/core/pipeline/runSlip',
  '@/src/components/research/',
  '@/app/stress-test/'
];

const violations = blocked.filter((token) => source.includes(token));

if (violations.length > 0) {
  console.error(`[check:landing-imports] blocked imports in ${target}:`);
  violations.forEach((entry) => console.error(` - ${entry}`));
  process.exit(1);
}

console.log('[check:landing-imports] ok');
