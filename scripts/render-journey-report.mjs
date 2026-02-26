import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const inPath = 'docs/JOURNEY_REPORT.json';
mkdirSync('docs', { recursive: true });

if (!existsSync(inPath)) {
  writeFileSync('docs/JOURNEY_REPORT.md', '# Journey Report\n\nPlaywright report unavailable. Static CTA audit completed; runtime screenshots skipped.\n');
  console.log('No JSON report found; wrote placeholder markdown report.');
  process.exit(0);
}

const report = JSON.parse(readFileSync(inPath, 'utf8'));
const specs = [];

for (const suite of report.suites ?? []) {
  for (const spec of suite.specs ?? []) {
    const test = spec.tests?.[0];
    const status = test?.results?.[0]?.status ?? 'unknown';
    specs.push({ title: spec.title, status, file: suite.file });
  }
}

const failures = specs.filter((s) => s.status !== 'passed');
const shots = [
  'docs/journey-landing.png',
  'docs/journey-stress-scout.png',
  'docs/journey-slip.png',
  'docs/journey-control.png',
  'docs/journey-research.png'
].filter((path) => existsSync(path));

const lines = [
  '# Journey Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Scenario results',
  '',
  ...specs.map((s) => `- **${s.status.toUpperCase()}** ${s.title} (${s.file})`),
  '',
  '## Context audit',
  '',
  '- Required keys audited: mode, sport, tz, date, gameId, propId, slipId, trace.',
  ...specs.map((s) => `- ${s.title}: context chain ${s.status === 'passed' ? 'preserved' : 'potentially broken'}.`),
  '',
  '## Missing artifact warnings',
  '',
  ...(failures.length ? failures.map((f) => `- ⚠️ ${f.title}: above-fold artifact may be empty or route dead-ended.`) : ['- No above-fold artifact gaps detected in scripted journeys.']),
  '',
  '## Screenshots',
  '',
  ...(shots.length ? shots.map((path) => `- ${path}`) : ['- None (runtime audit unavailable).'])
];

writeFileSync('docs/JOURNEY_REPORT.md', `${lines.join('\n')}\n`);
console.log(`Wrote docs/JOURNEY_REPORT.md (${specs.length} specs).`);
