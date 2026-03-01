import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const root = process.cwd();
const chunksDir = resolve(root, '.next/static/chunks');
const docsDir = resolve(root, 'docs/audit');
const reportMdPath = resolve(docsDir, 'chunk-fingerprint.md');
const reportJsonPath = resolve(docsDir, 'chunk-fingerprint.json');
const TARGET_PATTERNS = ['fd9d1056', '2117'];
const TOP_LIMIT = 30;

const normalizePackageRoot = (value) => {
  if (!value) return null;
  const cleaned = value.replace(/^\.pnpm\//, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  if (parts[0].startsWith('@')) {
    if (parts.length < 2) return parts[0];
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
};

const toSortedTop = (map) => Object.entries(map)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, TOP_LIMIT)
  .map(([name, count]) => ({ name, count }));

let chunkFiles = [];
try {
  chunkFiles = readdirSync(chunksDir)
    .filter((file) => file.endsWith('.js'))
    .filter((file) => TARGET_PATTERNS.some((pattern) => file.includes(pattern)));
} catch {
  console.error('[audit:chunk-fingerprint] missing build artifacts. Run `npm run build` first so .next/static/chunks exists.');
  process.exit(1);
}

if (chunkFiles.length === 0) {
  console.error(`[audit:chunk-fingerprint] no target chunks found in ${chunksDir}. Expected filenames containing: ${TARGET_PATTERNS.join(', ')}`);
  process.exit(1);
}

const report = {
  generatedAt: new Date().toISOString(),
  chunksDir: '.next/static/chunks',
  targets: TARGET_PATTERNS,
  chunks: {},
};

for (const filename of chunkFiles) {
  const filePath = resolve(chunksDir, filename);
  const text = readFileSync(filePath, 'utf8');

  const packageCounts = {};
  for (const match of text.matchAll(/node_modules\/([^"'\\)\]\s]+)/g)) {
    const rootPackage = normalizePackageRoot(match[1]);
    if (!rootPackage) continue;
    packageCounts[rootPackage] = (packageCounts[rootPackage] ?? 0) + 1;
  }

  const srcCounts = {};
  for (const match of text.matchAll(/@\/src\/([^"'\\)\]\s]+)/g)) {
    const key = `@/src/${match[1]}`;
    srcCounts[key] = (srcCounts[key] ?? 0) + 1;
  }

  const nextDistCounts = {};
  for (const match of text.matchAll(/next\/dist\/([^"'\\)\]\s]+)/g)) {
    const segment = match[1].split('/').slice(0, 2).join('/');
    const key = `next/dist/${segment}`;
    nextDistCounts[key] = (nextDistCounts[key] ?? 0) + 1;
  }

  report.chunks[filename] = {
    bytes: Buffer.byteLength(text, 'utf8'),
    packageRootHits: toSortedTop(packageCounts),
    srcPathHits: toSortedTop(srcCounts),
    nextDistHits: toSortedTop(nextDistCounts),
    notes: Object.keys(packageCounts).length === 0
      ? 'No literal node_modules paths found in minified chunk text.'
      : undefined,
  };
}

mkdirSync(docsDir, { recursive: true });
writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# Shared Chunk Fingerprint',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `Targets: ${TARGET_PATTERNS.map((pattern) => `\`${pattern}\``).join(', ')}`,
  '',
];

for (const [filename, chunk] of Object.entries(report.chunks)) {
  lines.push(`## ${filename}`);
  lines.push(`- Size: ${(chunk.bytes / 1024).toFixed(1)} kB`);
  if (chunk.notes) lines.push(`- Note: ${chunk.notes}`);

  lines.push('');
  lines.push('### Top package roots (node_modules/*)');
  if (chunk.packageRootHits.length === 0) {
    lines.push('- none detected');
  } else {
    for (const row of chunk.packageRootHits) {
      lines.push(`- ${row.name}: ${row.count}`);
    }
  }

  lines.push('');
  lines.push('### Top Next runtime path hits (next/dist/*)');
  if (chunk.nextDistHits.length === 0) {
    lines.push('- none detected');
  } else {
    for (const row of chunk.nextDistHits) {
      lines.push(`- ${row.name}: ${row.count}`);
    }
  }

  lines.push('');
  lines.push('### Top @/src path hits');
  if (chunk.srcPathHits.length === 0) {
    lines.push('- none detected');
  } else {
    for (const row of chunk.srcPathHits) {
      lines.push(`- ${row.name}: ${row.count}`);
    }
  }

  lines.push('');
}

lines.push(`JSON report: \`${basename(reportJsonPath)}\``);

writeFileSync(reportMdPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`[audit:chunk-fingerprint] wrote ${reportJsonPath.replace(`${root}/`, '')}`);
console.log(`[audit:chunk-fingerprint] wrote ${reportMdPath.replace(`${root}/`, '')}`);
for (const [filename, chunk] of Object.entries(report.chunks)) {
  console.log(`[audit:chunk-fingerprint] ${filename} size=${(chunk.bytes / 1024).toFixed(1)}kB packageHits=${chunk.packageRootHits.length} nextDistHits=${chunk.nextDistHits.length} srcHits=${chunk.srcPathHits.length}`);
}
