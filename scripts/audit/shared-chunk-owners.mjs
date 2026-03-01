import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const appManifestPath = resolve(root, '.next/app-build-manifest.json');
const buildManifestPath = resolve(root, '.next/build-manifest.json');
const reportJsonPath = resolve(root, 'docs/audit/shared-chunk-owners.json');
const reportMdPath = resolve(root, 'docs/audit/shared-chunk-owners.md');

const TARGET_PATTERNS = ['fd9d1056', '2117'];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const appManifest = readJson(appManifestPath);
const buildManifest = readJson(buildManifestPath);

if (!appManifest || !buildManifest) {
  console.error('[audit:shared-chunk-owners] missing build artifacts. Run `npm run build` first so .next/app-build-manifest.json and .next/build-manifest.json exist.');
  process.exit(1);
}

const appPages = appManifest.pages ?? {};
const pagesManifestPages = buildManifest.pages ?? {};

const allRouteEntries = {
  ...Object.fromEntries(Object.entries(appPages).map(([route, chunks]) => [route, Array.isArray(chunks) ? chunks : []])),
  ...Object.fromEntries(Object.entries(pagesManifestPages).map(([route, chunks]) => [`pages:${route}`, Array.isArray(chunks) ? chunks : []]))
};

const routeNames = Object.keys(allRouteEntries);

function uniq(list) {
  return [...new Set(list)];
}

function intersection(sets) {
  if (sets.length === 0) return [];
  return [...sets[0]].filter((item) => sets.every((s) => s.has(item)));
}

const routeChunkSets = Object.fromEntries(
  Object.entries(allRouteEntries).map(([route, chunks]) => [route, new Set(chunks)]),
);

const ownersByPattern = Object.fromEntries(
  TARGET_PATTERNS.map((pattern) => {
    const owners = routeNames
      .filter((route) => allRouteEntries[route].some((chunk) => chunk.includes(pattern)))
      .sort();

    const chunkFiles = uniq(
      owners.flatMap((route) => allRouteEntries[route].filter((chunk) => chunk.includes(pattern))),
    );

    return [pattern, {
      pattern,
      chunkFiles,
      routeCount: owners.length,
      routeCoverageRatio: routeNames.length === 0 ? 0 : owners.length / routeNames.length,
      topRouteOwners: owners.slice(0, 15),
      owners,
    }];
  }),
);

const commonChunkSet = intersection(Object.values(routeChunkSets)).sort();
const nearUniversalChunks = Object.entries(
  Object.values(allRouteEntries)
    .flat()
    .reduce((acc, chunk) => {
      acc[chunk] = (acc[chunk] ?? 0) + 1;
      return acc;
    }, {}),
)
  .map(([chunk, count]) => ({ chunk, count, ratio: count / routeNames.length }))
  .filter((entry) => entry.ratio >= 0.9)
  .sort((a, b) => b.count - a.count || a.chunk.localeCompare(b.chunk));

const targetOwnerSets = TARGET_PATTERNS
  .map((pattern) => new Set(ownersByPattern[pattern]?.owners ?? []))
  .filter((set) => set.size > 0);

const ownerIntersection = intersection(targetOwnerSets).sort();

const sharedSegments = Object.entries(
  ownerIntersection
    .flatMap((route) => route.split('/').filter(Boolean))
    .reduce((acc, segment) => {
      acc[segment] = (acc[segment] ?? 0) + 1;
      return acc;
    }, {}),
)
  .sort((a, b) => b[1] - a[1])
  .map(([segment, count]) => ({ segment, count }));

const universalRootCauseGuess = {
  candidate: ownerIntersection.includes('/layout')
    ? 'app/layout.tsx (and Next app runtime) appears in all target chunk owner sets via /layout route entry.'
    : 'Target chunks are nearly universal framework/runtime chunks across App Router routes.',
  supportingSegments: sharedSegments.slice(0, 10),
  ownerIntersectionCount: ownerIntersection.length,
  totalRoutesObserved: routeNames.length,
};

const report = {
  generatedAt: new Date().toISOString(),
  manifests: {
    appBuildManifest: '.next/app-build-manifest.json',
    buildManifest: '.next/build-manifest.json',
  },
  totals: {
    routesObserved: routeNames.length,
    appRoutesObserved: Object.keys(appPages).length,
    pagesManifestRoutesObserved: Object.keys(pagesManifestPages).length,
  },
  targetChunkOwners: ownersByPattern,
  commonChunkSet,
  nearUniversalChunks,
  universalRootCauseGuess,
};

mkdirSync(resolve(root, 'docs/audit'), { recursive: true });
writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const md = [
  '# Shared Chunk Owners Audit',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `- Routes observed: **${report.totals.routesObserved}**`,
  `- App routes observed: **${report.totals.appRoutesObserved}**`,
  `- Pages-manifest routes observed: **${report.totals.pagesManifestRoutesObserved}**`,
  '',
  '## Target chunk ownership',
  '',
  ...TARGET_PATTERNS.flatMap((pattern) => {
    const row = ownersByPattern[pattern];
    return [
      `### ${pattern}`,
      `- Chunk files: ${row.chunkFiles.join(', ') || 'none found'}`,
      `- Route owners: **${row.routeCount}/${routeNames.length}** (${(row.routeCoverageRatio * 100).toFixed(1)}%)`,
      '- Top owners:',
      ...row.topRouteOwners.map((route) => `  - ${route}`),
      '',
    ];
  }),
  '## Common chunk set across all observed routes',
  '',
  ...commonChunkSet.map((chunk) => `- ${chunk}`),
  '',
  '## Near-universal chunks (>=90% of routes)',
  '',
  ...nearUniversalChunks.slice(0, 20).map((entry) => `- ${entry.chunk} — ${entry.count}/${routeNames.length} routes (${(entry.ratio * 100).toFixed(1)}%)`),
  '',
  '## Universal root-cause guess',
  '',
  `- ${universalRootCauseGuess.candidate}`,
  `- Target-owner intersection size: ${universalRootCauseGuess.ownerIntersectionCount}`,
  '- Shared route segments in target-owner intersection:',
  ...universalRootCauseGuess.supportingSegments.map((entry) => `  - ${entry.segment}: ${entry.count}`),
  '',
  `JSON report: \`${reportJsonPath.replace(`${root}/`, '')}\``,
].join('\n');

writeFileSync(reportMdPath, `${md}\n`, 'utf8');

console.log(`[audit:shared-chunk-owners] wrote ${reportJsonPath}`);
console.log(`[audit:shared-chunk-owners] wrote ${reportMdPath}`);

for (const pattern of TARGET_PATTERNS) {
  const row = ownersByPattern[pattern];
  console.log(`[audit:shared-chunk-owners] ${pattern}: ${row.routeCount}/${routeNames.length} routes (${(row.routeCoverageRatio * 100).toFixed(1)}%)`);
}

console.log('[audit:shared-chunk-owners] common chunks across all routes:');
for (const chunk of commonChunkSet) {
  console.log(`  - ${chunk}`);
}

console.log(`[audit:shared-chunk-owners] guess: ${universalRootCauseGuess.candidate}`);
