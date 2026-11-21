import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const run = (program, args) => spawnSync(program, args, { stdio: 'inherit' });
const staticAudit = run('node', ['scripts/audit-cta-graph.mjs']);
if (staticAudit.status !== 0) process.exit(staticAudit.status ?? 1);

rmSync('docs/JOURNEY_REPORT.json', { force: true });
const journey = run('playwright', ['test', 'tests/journey.spec.ts']);
if (journey.error) console.error(journey.error.message);
const report = run('node', ['scripts/render-journey-report.mjs']);
process.exitCode = (journey.status ?? 1) || (report.status ?? 1);
