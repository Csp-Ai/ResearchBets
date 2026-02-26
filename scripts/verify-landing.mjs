import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'public/landing.html',
  'next.config.mjs',
];

for (const file of requiredFiles) {
  const filePath = resolve(root, file);
  if (!existsSync(filePath)) {
    console.error(`Missing required file: ${file}`);
    process.exit(1);
  }
}

const nextConfig = readFileSync(resolve(root, 'next.config.mjs'), 'utf8');
const hasRedirect =
  /source:\s*["']\/["']/.test(nextConfig) &&
  /destination:\s*["']\/landing\.html["']/.test(nextConfig);

if (!hasRedirect) {
  console.error('Expected redirect from "/" to "/landing.html" not found in next.config.mjs');
  process.exit(1);
}

const hasAppHome = existsSync(resolve(root, 'app/page.tsx'));
const hasPagesHome = existsSync(resolve(root, 'pages/index.tsx')) || existsSync(resolve(root, 'pages/index.js'));

if (!hasAppHome && !hasPagesHome) {
  console.error('No home route file found (expected app/page.tsx or pages/index.*)');
  process.exit(1);
}

console.log('Landing integration checks passed.');
