import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const inPath = 'docs/JOURNEY_REPORT.json';
mkdirSync('docs', { recursive: true });

if (!existsSync(inPath)) {
  writeFileSync('docs/JOURNEY_REPORT.md', '# Journey Report\n\nNo Playwright report was found at `docs/JOURNEY_REPORT.json`.\n');
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
const lines = [
  '# Journey Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Scenario results',
  '',
  ...specs.map((s) => `- **${s.status.toUpperCase()}** ${s.title} (${s.file})`),
  '',
  '## Continuity breaks',
  '',
  ...(failures.length
    ? failures.map((f) => `- ${f.title}: inspect ${f.file} for empty-state or context handoff issues.`)
    : ['- No continuity breaks detected in the scripted golden paths.']),
  '',
  '## File pointers',
  '',
  '- Landing CTAs: `src/components/landing/LandingPageClient.tsx`',
  '- Ingest journey: `app/ingest/IngestPageClient.tsx`',
  '- Stress test scout route: `app/stress-test/page.tsx`'
];

writeFileSync('docs/JOURNEY_REPORT.md', `${lines.join('\n')}\n`);
console.log(`Wrote docs/JOURNEY_REPORT.md (${specs.length} specs).`);
