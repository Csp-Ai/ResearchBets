import { readFileSync } from 'node:fs';

const targets = [
  'app/(home)/page.tsx',
  'app/HomeLandingClient.tsx',
  'app/(product)/today/page.tsx',
  'app/(product)/slip/page.tsx',
  'app/(product)/slip/SlipPageClient.tsx',
  'app/(product)/track/page.tsx',
  'app/(product)/track/TrackPageClient.tsx',
  'src/components/track/DuringStageTracker.tsx',
];

const violations = [];

for (const file of targets) {
  const source = readFileSync(file, 'utf8');

  const writeCamelCase = source.match(/(appendQuery|toHref|withTraceId)\([^)]*\{[^}]*\b(traceId|slipId)\s*:/g);
  if (writeCamelCase) {
    violations.push(`${file}: generated link/query writes camelCase key(s) ${writeCamelCase.map((m) => m.includes('traceId') ? 'traceId' : 'slipId').join(',')}`);
  }

  const literalCamelCase = source.match(/[?&](traceId|slipId)=/g);
  if (literalCamelCase) {
    violations.push(`${file}: literal query uses camelCase key(s) ${[...new Set(literalCamelCase)].join(',')}`);
  }

  const linkCamelCase = source.match(/href=\{?[^\n}]*\b(traceId|slipId)\b/g);
  if (linkCamelCase) {
    violations.push(`${file}: href builder references camelCase id in URL generation`);
  }
}

if (violations.length) {
  console.error('[casing-guard] snake_case continuity failed:');
  violations.forEach((entry) => console.error(` - ${entry}`));
  process.exit(1);
}

console.log('[casing-guard] bettor-facing link generation uses snake_case ids');
