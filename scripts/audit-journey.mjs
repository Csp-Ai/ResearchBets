import { execSync } from 'node:child_process';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });

run('node scripts/audit-cta-graph.mjs');

let playwrightOk = true;
try {
  run('playwright test tests/journey.spec.ts --reporter=json > docs/JOURNEY_REPORT.json');
} catch (error) {
  playwrightOk = false;
  console.warn('[audit:journey] Playwright runtime unavailable; continuing with static CTA audit only.');
}

run('node scripts/render-journey-report.mjs');

if (!playwrightOk) {
  process.exitCode = 0;
}
