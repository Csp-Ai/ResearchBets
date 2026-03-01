import { readFileSync } from 'node:fs';

const HARD_RESET_COMMENT = 'continuity-hard-reset-ok';

const targets = [
  'app/(home)/page.tsx',
  'app/HomeLandingClient.tsx',
  'app/(product)/today/page.tsx',
  'app/(product)/slip/page.tsx',
  'app/(product)/slip/SlipPageClient.tsx',
  'app/(product)/track/page.tsx',
  'app/(product)/track/TrackPageClient.tsx',
  'app/(product)/control/ControlPageClient.tsx',
  'src/components/track/DuringStageTracker.tsx',
  'src/components/bettor/GuidedActionsCard.tsx',
  'src/components/bettor/BettorFirstBlocks.tsx',
  'src/components/landing/PostmortemPreviewCard.tsx',
  'src/components/landing/VerdictMock.tsx',
  'src/components/landing/RiskGauge.tsx',
  'src/components/landing/LandingPageClient.tsx',
];

const allowlistRaw = new Set();

function isCommentAllowlisted(source, index) {
  const lineStart = source.lastIndexOf('\n', index) + 1;
  const lineEndIdx = source.indexOf('\n', index);
  const lineEnd = lineEndIdx === -1 ? source.length : lineEndIdx;
  const line = source.slice(lineStart, lineEnd);
  return line.includes(HARD_RESET_COMMENT);
}
const violations = [];

for (const file of targets) {
  const text = readFileSync(file, 'utf8');

  const rawNavPatterns = [
    /router\.(push|replace)\(\s*(['"`])(\/[\s\S]*?)\2/gm,
    /<Link[^>]*\shref=\s*(['"`])(\/[\s\S]*?)\1/gm,
    /redirect\(\s*(['"`])(\/[\s\S]*?)\1\s*\)/gm,
  ];

  for (const pattern of rawNavPatterns) {
    for (const match of text.matchAll(pattern)) {
      const rawPath = (match[3] ?? match[2] ?? '').trim();
      if (!rawPath.startsWith('/')) continue;
      const key = `${file}:${rawPath}`;
      if (allowlistRaw.has(key) || isCommentAllowlisted(text, match.index ?? 0)) continue;
      violations.push(`${file}: raw navigation "${rawPath}" (add ${HARD_RESET_COMMENT} comment if intentional hard reset)`);
    }
  }

  if (/(appendQuery|toHref|withTraceId)\([^)]*\{[^}]*\b(traceId|slipId)\s*:/.test(text)) {
    violations.push(`${file}: camelCase query write detected (traceId/slipId)`);
  }

  if (/[?&](traceId|slipId)=/.test(text)) {
    violations.push(`${file}: camelCase URL query detected (traceId/slipId)`);
  }
}

if (violations.length) {
  console.error('Navigation continuity guard failed. Use nervous.toHref() + snake_case ids.');
  violations.slice(0, 120).forEach((entry) => console.error(` - ${entry}`));
  process.exit(1);
}

console.log('toHref guard passed');
