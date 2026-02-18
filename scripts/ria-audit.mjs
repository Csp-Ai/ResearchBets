#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const mode = process.env.RIA_MODE || 'pr';
const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, 'docs/ria');
const canonicalFiles = [
  'src/core/markets/marketType.ts',
  'src/core/slips/extract.ts',
  'src/flows/researchSnapshot/buildResearchSnapshot.ts',
  'src/agents/researchSnapshot/ResearchSnapshotAgent.ts',
  'src/core/persistence/runtimeStore.ts',
  'src/core/measurement/recommendations.ts',
];

const MARKET_TOKEN_RE = /['"`]([a-z_\- ]{3,})['"`]/g;
const KNOWN_MARKETS = new Set([
  'points','rebounds','assists','threes','3pm','pts','pra','steals','blocks','turnovers','double_double','triple_double',
]);

const ensureDir = (d) => fs.mkdirSync(d, { recursive: true });
const read = (f) => fs.readFileSync(path.join(repoRoot, f), 'utf8');
const write = (f, data) => fs.writeFileSync(path.join(repoRoot, f), data);
const fileExists = (f) => fs.existsSync(path.join(repoRoot, f));

function sh(cmd) {
  return execSync(cmd, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function listFiles() {
  if (mode === 'full' || mode === 'baseline') {
    return sh('rg --files').split('\n').filter(Boolean);
  }
  let changed = [];
  try {
    const base = process.env.GIT_BASE_REF || process.env.GITHUB_BASE_REF;
    const head = process.env.GIT_HEAD_REF || process.env.GITHUB_SHA || 'HEAD';
    if (base) {
      changed = sh(`git diff --name-only ${base}...${head}`).split('\n').filter(Boolean);
    } else {
      changed = sh('git diff --name-only HEAD~1...HEAD').split('\n').filter(Boolean);
    }
  } catch {
    changed = [];
  }
  return [...new Set([...changed, ...canonicalFiles])].filter((f) => fileExists(f));
}

function lineOfIndex(content, idx) {
  return content.slice(0, idx).split('\n').length;
}

function scanMarketUsage(files) {
  const out = { canonical: [], acceptable: [], violations: [] };
  for (const file of files) {
    if (!file.match(/\.(ts|tsx|js|jsx)$/)) continue;
    const content = read(file);
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const lower = line.toLowerCase();
      const shouldInspect = /market|prop|label|insight|slip/.test(lower);
      if (!shouldInspect) continue;
      let m;
      while ((m = MARKET_TOKEN_RE.exec(line))) {
        const token = m[1].trim().toLowerCase();
        if (!KNOWN_MARKETS.has(token)) continue;
        const sig = { file, line: i + 1, signature: `${file}:${i + 1}:${token}` };
        if (/asMarketType\(|MarketType|MARKET_TYPE_LABELS|marketTypeLabel/.test(line)) {
          out.canonical.push(sig);
        } else if (/label|title|description|ui|display/i.test(line)) {
          out.acceptable.push(sig);
        } else {
          const protectedFile = /src\/(core\/slips|agents|features|components|app)\//.test(file);
          if (protectedFile) out.violations.push({ ...sig, token });
          else out.acceptable.push(sig);
        }
      }
    }
  }
  return out;
}

function determinismAudit() {
  const targets = [
    'src/flows/researchSnapshot/buildResearchSnapshot.ts',
    'src/agents/researchSnapshot/ResearchSnapshotAgent.ts',
  ].filter(fileExists);
  const findings = [];
  for (const file of targets) {
    const content = read(file);
    const patterns = [/Date\.now\(/g, /Math\.random\(/g, /\bfetch\(/g, /for \(const .* of Object\.keys\(/g];
    for (const p of patterns) {
      let m;
      while ((m = p.exec(content))) {
        const line = lineOfIndex(content, m.index);
        findings.push({ file, line, pattern: p.source, signature: `${file}:${line}:${p.source}` });
      }
    }
  }
  return findings;
}

function findEntrypoints() {
  const all = sh('rg --files').split('\n').filter(Boolean);
  return {
    api: all.filter((f) => f.startsWith('app/api/') && f.endsWith('/route.ts')),
    flows: all.filter((f) => f.startsWith('src/flows/') && f.endsWith('.ts')),
    agents: all.filter((f) => f.startsWith('src/agents/') && /Agent\.ts$/.test(f)),
    ui_pages: all.filter((f) => f.startsWith('app/') && f.endsWith('/page.tsx')),
  };
}

function listRefs(pattern, files) {
  const refs = [];
  for (const file of files) {
    if (!fileExists(file)) continue;
    const lines = read(file).split('\n');
    lines.forEach((line, idx) => {
      if (line.includes(pattern)) refs.push({ file, line: idx + 1 });
    });
  }
  return refs;
}

function toAnnotation(level, v, msg) {
  if (!v.file || !v.line) return `::${level}::${msg}`;
  return `::${level} file=${v.file},line=${v.line}::${msg}`;
}

ensureDir(docsDir);
const scannedFiles = listFiles();
const allFiles = sh('rg --files').split('\n').filter(Boolean);
const marketUsage = scanMarketUsage(scannedFiles);
const det = determinismAudit();
const entrypoints = findEntrypoints();

const hardViolations = [];
const softWarnings = [];

// H1
for (const v of marketUsage.violations) {
  hardViolations.push({ ...v, rule: 'H1', message: `Hardcoded market token '${v.token}' bypasses MarketType canonicalization.` });
}

// H2
for (const file of canonicalFiles.slice(1)) {
  if (!fileExists(file)) continue;
  const content = read(file);
  if (/runtimeStore|recommendations|buildResearchSnapshot|ResearchSnapshotAgent/.test(file) && !content.includes('marketType')) {
    hardViolations.push({ file, line: 1, signature: `${file}:1:H2`, rule: 'H2', message: 'marketType is missing from critical flow component.' });
  }
}

// H3
for (const d of det.filter((x) => /Date\.now|Math\.random/.test(x.pattern))) {
  hardViolations.push({ ...d, rule: 'H3', message: `Nondeterministic call '${d.pattern}' found in snapshot path.` });
}

// H4
if (fileExists('src/core/slips/extract.ts')) {
  const lines = read('src/core/slips/extract.ts').split('\n');
  const bad = lines.findIndex((line) => line.includes('asMarketType(') && !line.includes(','));
  if (bad >= 0) {
    hardViolations.push({ file: 'src/core/slips/extract.ts', line: bad + 1, signature: `src/core/slips/extract.ts:${bad + 1}:H4`, rule: 'H4', message: 'asMarketType must include explicit fallback.' });
  }
}

// Soft warnings
if (!allFiles.some((f) => f.includes('prop') && f.includes('__tests__'))) {
  softWarnings.push({ rule: 'S2', message: 'No prop-related tests found.' });
}
const insightBypasses = scannedFiles.filter((f) => /features|components/.test(f) && fileExists(f)).flatMap((f) => {
  const lines = read(f).split('\n');
  return lines.flatMap((line, idx) => (/prop insight|leg insight/i.test(line) && !/buildPropLegInsight/.test(line) ? [{ file: f, line: idx + 1, signature: `${f}:${idx + 1}:S3` }] : []));
});
insightBypasses.forEach((x) => softWarnings.push({ ...x, rule: 'S3', message: 'Possible bypass of canonical prop insight builder.' }));

const marketDrift = Math.min(25, hardViolations.filter((v) => v.rule === 'H1').length * 10);
const extraParsing = Math.min(25 - marketDrift, marketUsage.violations.length * 5);
const flowDrift = Math.min(25, hardViolations.filter((v) => v.rule === 'H2').length * 10);
const detDrift = Math.min(25, hardViolations.filter((v) => v.rule === 'H3').length * 10 + det.filter((d) => /fetch/.test(d.pattern)).length * 5);
const obsDrift = Math.min(25, hardViolations.filter((v) => v.rule === 'H2' && /recommendations/.test(v.file)).length * 10 + softWarnings.filter((w) => w.rule === 'S4').length * 5);
const categoryScores = {
  market_discipline_drift: Math.min(25, marketDrift + extraParsing),
  flow_integrity_drift: flowDrift,
  determinism_reproducibility_drift: detDrift,
  observability_measurement_drift: obsDrift,
};
const driftScoreTotal = Object.values(categoryScores).reduce((a, b) => a + b, 0);

const commitSha = (() => {
  try { return sh('git rev-parse HEAD'); } catch { return 'unknown'; }
})();
const nowIso = new Date().toISOString();

const flowMap = {
  nodes: ['ingestion', 'normalization', 'snapshot', 'persistence', 'measurement', 'ui_replay'],
  edges: [
    ['ingestion', 'normalization'],
    ['normalization', 'snapshot'],
    ['snapshot', 'persistence'],
    ['persistence', 'measurement'],
    ['measurement', 'ui_replay'],
  ],
};

const archState = {
  repo_version: commitSha,
  timestamp: nowIso,
  mode,
  flow_map: flowMap,
  entrypoints,
  market_usage_summary: {
    canonical_count: marketUsage.canonical.length,
    acceptable_count: marketUsage.acceptable.length,
    violation_count: marketUsage.violations.length,
    violations: marketUsage.violations,
  },
  persistence_schema_refs: listRefs('marketType', ['src/core/persistence/runtimeStore.ts', 'src/core/persistence/runtimeDb.ts', 'src/core/measurement/recommendations.ts']),
  measurement_schema_refs: listRefs('marketType', ['src/core/measurement/recommendations.ts', 'src/core/measurement/results.ts']),
  test_refs: allFiles.filter((f) => f.includes('test') && /prop|slip|snapshot|recommendation|market/i.test(f)),
};

const baselinePath = 'docs/ria/ARCH_BASELINE.json';
if (mode === 'baseline') {
  if (process.env.RIA_ALLOW_BASELINE !== '1') {
    console.error('Baseline updates require explicit authorization: set RIA_ALLOW_BASELINE=1');
    process.exit(2);
  }
  write(baselinePath, `${JSON.stringify(archState, null, 2)}\n`);
} else if (!fileExists(baselinePath)) {
  write(baselinePath, `${JSON.stringify(archState, null, 2)}\n`);
}

write('docs/ria/ARCH_STATE.json', `${JSON.stringify(archState, null, 2)}\n`);

if (!fileExists('docs/ria/INVARIANTS.md')) {
  write('docs/ria/INVARIANTS.md', `# RIA Invariants\n\n## Hard Rules\n- H1: No ad-hoc market strings where MarketType is expected; parsing via asMarketType(value, fallback).\n- H2: marketType flows leg → snapshot → persistence → measurement.\n- H3: Snapshot path is deterministic unless explicitly documented.\n- H4: Missing/invalid markets must use explicit fallback (e.g., asMarketType(value, 'points')).\n\n## Soft Warnings\n- S1: Avoid duplicate prop tag/risk/label logic.\n- S2: Add tests for prop workflow changes.\n- S3: UI should use canonical prop insight builders.\n- S4: Claims should be traceable to runtime events/citations.\n- S5: Avoid excessive cross-layer coupling.\n`);
}

const topViolations = [...hardViolations, ...softWarnings]
  .filter((v) => v.signature || v.rule)
  .slice(0, 3)
  .map((v) => v.signature || v.rule);

const historyLine = {
  timestamp: nowIso,
  commit_sha: commitSha,
  mode,
  drift_score_total: driftScoreTotal,
  category_scores: categoryScores,
  violations_count: hardViolations.length + softWarnings.length,
  top_violation_signatures: topViolations,
};
fs.appendFileSync(path.join(repoRoot, 'docs/ria/DRIFT_HISTORY.jsonl'), `${JSON.stringify(historyLine)}\n`);

const hardSection = hardViolations.length
  ? hardViolations.map((v) => `- [${v.rule}] ${v.message} (${v.file}:${v.line})`).join('\n')
  : '- None';
const softSection = softWarnings.length
  ? softWarnings.map((v) => `- [${v.rule}] ${v.message}${v.file ? ` (${v.file}:${v.line})` : ''}`).join('\n')
  : '- None';

const recommendedAction = hardViolations.length > 0 || driftScoreTotal >= 60 ? 'FAIL' : driftScoreTotal >= 35 ? 'WARN' : 'PASS';

const report = `# RIA Report\n\n## Executive summary\n- Mode: ${mode}\n- Drift total: **${driftScoreTotal}/100**\n- Hard violations: **${hardViolations.length}**\n- Soft warnings: **${softWarnings.length}**\n\n## Drift score breakdown\n- Market Discipline Drift: ${categoryScores.market_discipline_drift}/25\n- Flow Integrity Drift: ${categoryScores.flow_integrity_drift}/25\n- Determinism & Reproducibility Drift: ${categoryScores.determinism_reproducibility_drift}/25\n- Observability & Measurement Drift: ${categoryScores.observability_measurement_drift}/25\n\n## Repo flow map\n- ingestion → normalization → snapshot → persistence → measurement → UI replay\n\n## Hard violations\n${hardSection}\n\n## Soft warnings\n${softSection}\n\n## Suggested fixes\n- Route market parsing through \`asMarketType(value, fallback)\` and use MarketType label mappings in UX.\n- Ensure all persisted leg/recommendation records include \`marketType\`.\n- Remove nondeterministic snapshot behavior or introduce deterministic seed controls.\n- Add prop workflow tests for fallback, matchup/injury note surfacing, and market-scoped persistence.\n\n## PR-specific notes\n${mode === 'pr' ? `- Deep scan applied to changed files (${scannedFiles.length}) and canonical architecture files.` : '- Full repository scan performed.'}\n\n## Next Invariants\n- Promote repeated warning signatures to hard rules if they recur over 3+ runs.\n\n## CI Summary\n- drift_score_total: ${driftScoreTotal}\n- hard_fail_count: ${hardViolations.length}\n- warning_count: ${softWarnings.length}\n- top_3_violations: ${topViolations.join(', ') || 'none'}\n- recommended_action: ${recommendedAction}\n`;

write('docs/ria/RIA_REPORT.md', report);

for (const v of hardViolations) {
  console.log(toAnnotation('error', v, `[${v.rule}] ${v.message}`));
}
for (const w of softWarnings) {
  console.log(toAnnotation('warning', w, `[${w.rule}] ${w.message}`));
}

console.log(`CI Summary: drift=${driftScoreTotal}, hard=${hardViolations.length}, warnings=${softWarnings.length}, action=${recommendedAction}`);

if (hardViolations.length > 0 || driftScoreTotal >= 60) {
  process.exit(1);
}
