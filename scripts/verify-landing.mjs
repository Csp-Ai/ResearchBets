import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const appPagePath = resolve(root, 'app/page.tsx');
if (!existsSync(appPagePath)) {
  fail('Missing required file: app/page.tsx');
}

const appPageContent = readFileSync(appPagePath, 'utf8');
if (!appPageContent.includes('LandingPageClient')) {
  fail('app/page.tsx must reference LandingPageClient.');
}

const nextConfigPath = resolve(root, 'next.config.mjs');
if (!existsSync(nextConfigPath)) {
  fail('Missing required file: next.config.mjs');
}

const hasRootToLandingRedirect = (content) => {
  return (
    /source\s*:\s*['"]\/(?:['"])/.test(content) &&
    /destination\s*:\s*['"]\/landing\.html['"]/.test(content)
  );
};

const nextConfig = readFileSync(nextConfigPath, 'utf8');
if (hasRootToLandingRedirect(nextConfig)) {
  fail('next.config.mjs must not redirect "/" to "/landing.html".');
}

const middlewareCandidates = ['middleware.ts', 'middleware.js'];
for (const candidate of middlewareCandidates) {
  const filePath = resolve(root, candidate);
  if (!existsSync(filePath)) continue;
  const content = readFileSync(filePath, 'utf8');
  if (hasRootToLandingRedirect(content) || content.includes('/landing.html')) {
    fail(`${candidate} must not redirect or rewrite "/" to "/landing.html".`);
  }
}

const vercelPath = resolve(root, 'vercel.json');
if (existsSync(vercelPath)) {
  const vercelContent = readFileSync(vercelPath, 'utf8');
  if (hasRootToLandingRedirect(vercelContent) || vercelContent.includes('/landing.html')) {
    fail('vercel.json must not redirect or rewrite "/" to "/landing.html".');
  }
}

const landingPath = resolve(root, 'public/landing.html');
if (existsSync(landingPath)) {
  console.warn("Note: public/landing.html exists as legacy preview; '/' is owned by app/page.tsx.");
}

console.log('Landing verification passed: app/page.tsx is canonical and no root redirect to /landing.html exists.');
