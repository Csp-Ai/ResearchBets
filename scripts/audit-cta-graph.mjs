import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync("rg --files app src/components src/app 2>/dev/null | tr '\n' ' '", { encoding: 'utf8' })
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .filter((file) => /\.(tsx?|jsx?)$/.test(file));

const entries = [];

const CONTEXT_KEYS = ['mode', 'sport', 'tz', 'date', 'gameId', 'propId', 'slipId', 'trace'];
const hasKnownContext = (href) => CONTEXT_KEYS.some((key) => href.includes(`${key}=`));


for (const file of files) {
  const content = readFileSync(file, 'utf8');

  const linkRegex = /<Link[^>]*href=["'`]([^"'`]+)["'`][^>]*>([\s\S]*?)<\/Link>/g;
  for (const match of content.matchAll(linkRegex)) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'unknown';
    entries.push({ type: 'Link', file, href, label: text, routeCategory: href.split('?')[0] || href });
  }

  const pushRegex = /router\.(push|replace)\(([^\)]+)\)/g;
  for (const match of content.matchAll(pushRegex)) {
    const hrefRaw = match[2].trim();
    const href = hrefRaw.replace(/[`"']/g, '');
    entries.push({ type: `router.${match[1]}`, file, href, label: 'programmatic navigation', routeCategory: href.split('?')[0] || href });
  }
}

const duplicateLabels = new Map();
for (const row of entries) {
  const key = row.label.toLowerCase();
  const set = duplicateLabels.get(key) ?? new Set();
  set.add(row.href);
  duplicateLabels.set(key, set);
}

const findings = [];
for (const [label, hrefs] of duplicateLabels.entries()) {
  if (hrefs.size > 1 && label !== 'unknown') {
    findings.push({ severity: 'warn', type: 'duplicate_label', label, hrefs: [...hrefs] });
  }
}

for (const row of entries) {
  const isResearchSurface = row.file.includes('/landing/') || row.file.includes('/research/') || row.file.includes('/today/');
  const isInternal = row.href.startsWith('/') || row.href.startsWith('`/');
  if (isResearchSurface && isInternal && !hasKnownContext(row.href) && !row.href.includes('#') && !row.href.includes('mailto:')) {
    findings.push({ severity: 'warn', type: 'context_loss_risk', file: row.file, href: row.href, label: row.label });
  }
}


const output = { generatedAt: new Date().toISOString(), entries, findings };
mkdirSync('docs', { recursive: true });
writeFileSync('docs/CTA_GRAPH.json', `${JSON.stringify(output, null, 2)}\n`);

const lines = [
  '# CTA Graph Audit',
  '',
  `Generated: ${output.generatedAt}`,
  '',
  '## CTA Entries',
  '',
  '| Source file | Type | Label | Href | Route category |',
  '| --- | --- | --- | --- | --- |',
  ...entries.map((row) => `| ${row.file} | ${row.type} | ${row.label.replace(/\|/g, '\\|')} | ${row.href} | ${row.routeCategory} |`),
  '',
  '## Findings',
  '',
  ...(findings.length ? findings.map((f) => `- **${f.type}**: ${JSON.stringify(f)}`) : ['- No continuity issues detected by static rules.'])
];

writeFileSync('docs/CTA_GRAPH.md', `${lines.join('\n')}\n`);
console.log(`Wrote docs/CTA_GRAPH.json with ${entries.length} entries and ${findings.length} findings.`);
