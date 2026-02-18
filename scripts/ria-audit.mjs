#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const mode = process.env.RIA_MODE || 'pr';
const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, 'docs/ria');
const isCi = process.env.GITHUB_ACTIONS === 'true';
const shouldPersistState = isCi || process.env.RIA_WRITE_STATE === '1' || mode === 'baseline';
const BASELINE_COMMIT_TAG = 'ria: update baseline';
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

function readLastHistorySignatures() {
  const historyPath = path.join(repoRoot, 'docs/ria/DRIFT_HISTORY.jsonl');
  if (!fs.existsSync(historyPath)) return new Set();
  const lines = fs.readFileSync(historyPath, 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length === 0) return new Set();
  try {
    const parsed = JSON.parse(lines[lines.length - 1]);
    return new Set(parsed.violation_signatures || []);
  } catch {
    return new Set();
  }
}

function buildViolationSignature(v) {
  const id = v.id || v.rule || 'UNKNOWN';
  const file = v.file || 'unknown';
  const locus = v.token || v.pattern || v.line || 'n/a';
  return `${id}:${file}:${String(locus)}`;
}

function checkBaselineGovernance() {
  if (mode !== 'baseline') return;
  if (isCi) {
    console.error('Baseline mode is not permitted in CI. Run baseline updates manually.');
    process.exit(2);
  }
  if (process.env.RIA_ALLOW_BASELINE !== '1') {
    console.error('Baseline updates require explicit authorization: set RIA_ALLOW_BASELINE=1');
    process.exit(2);
  }
  const commitMessage = sh('git log -1 --pretty=%B');
  if (!commitMessage.toLowerCase().includes(BASELINE_COMMIT_TAG)) {
    console.error(`Baseline updates require commit message tag: "${BASELINE_COMMIT_TAG}"`);
    process.exit(2);
  }
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
checkBaselineGovernance();
const scannedFiles = listFiles();
const allFiles = sh('rg --files').split('\n').filter(Boolean);
const marketUsage = scanMarketUsage(scannedFiles);
const det = determinismAudit();
const entrypoints = findEntrypoints();

const hardViolations = [];
const softWarnings = [];

// H1
for (const v of marketUsage.violations) {
  hardViolations.push({ ...v, id: 'H1/HARDCODED_MARKET_STRING', rule: 'H1', message: `Hardcoded market token '${v.token}' bypasses MarketType canonicalization.` });
}

// H2
for (const file of canonicalFiles.slice(1)) {
  if (!fileExists(file)) continue;
  const content = read(file);
  if (/runtimeStore|recommendations|buildResearchSnapshot|ResearchSnapshotAgent/.test(file) && !content.includes('marketType')) {
    hardViolations.push({ file, line: 1, id: 'H2/MISSING_MARKETTYPE_FLOW', signature: `${file}:1:H2`, rule: 'H2', message: 'marketType is missing from critical flow component.' });
  }
}

// H3
for (const d of det.filter((x) => /Date\.now|Math\.random/.test(x.pattern))) {
  hardViolations.push({ ...d, id: 'H3/NONDETERMINISM', rule: 'H3', message: `Nondeterministic call '${d.pattern}' found in snapshot path.` });
}

// H4
if (fileExists('src/core/slips/extract.ts')) {
  const lines = read('src/core/slips/extract.ts').split('\n');
  const bad = lines.findIndex((line) => line.includes('asMarketType(') && !line.includes(','));
  if (bad >= 0) {
    hardViolations.push({ file: 'src/core/slips/extract.ts', line: bad + 1, id: 'H4/MISSING_MARKET_FALLBACK', signature: `src/core/slips/extract.ts:${bad + 1}:H4`, rule: 'H4', message: 'asMarketType must include explicit fallback.' });
  }
}

// Soft warnings
if (!allFiles.some((f) => f.includes('prop') && f.includes('__tests__'))) {
  softWarnings.push({ id: 'S2/PROP_WORKFLOW_WITHOUT_TESTS', rule: 'S2', message: 'No prop-related tests found.' });
}
const insightBypasses = scannedFiles.filter((f) => /features|components/.test(f) && fileExists(f)).flatMap((f) => {
  const lines = read(f).split('\n');
  return lines.flatMap((line, idx) => (/prop insight|leg insight/i.test(line) && !/buildPropLegInsight/.test(line) ? [{ file: f, line: idx + 1, signature: `${f}:${idx + 1}:S3` }] : []));
});
insightBypasses.forEach((x) => softWarnings.push({ ...x, id: 'S3/INSIGHT_BUILDER_BYPASS', rule: 'S3', message: 'Possible bypass of canonical prop insight builder.' }));

const duplicatedPropLogic = scannedFiles
  .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f) && /components|features|app\//.test(f) && fileExists(f))
  .flatMap((f) => {
    const lines = read(f).split('\n');
    return lines.flatMap((line, idx) => (/riskTag|propTag|marketTypeLabel/.test(line) && !/MARKET_TYPE_LABELS|buildPropLegInsight/.test(line)
      ? [{ file: f, line: idx + 1, signature: `${f}:${idx + 1}:S1` }]
      : []));
  });
duplicatedPropLogic.forEach((x) => softWarnings.push({ ...x, id: 'S1/DUPLICATED_PROP_LOGIC', rule: 'S1', message: 'Potential duplicated prop tag/risk/label logic found in UI component.' }));

const untracedEvidence = scannedFiles
  .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f) && fileExists(f))
  .flatMap((f) => {
    const lines = read(f).split('\n');
    return lines.flatMap((line, idx) => {
      const hasClaimPayload = /\b(claim|evidence)\s*[:=]/i.test(line);
      if (!hasClaimPayload) return [];
      const context = lines.slice(Math.max(0, idx - 3), Math.min(lines.length, idx + 4)).join(' ');
      if (/trace|event|citation|emit/i.test(context)) return [];
      return [{ file: f, line: idx + 1, signature: `${f}:${idx + 1}:S4` }];
    });
  });
untracedEvidence.forEach((x) => softWarnings.push({ ...x, id: 'S4/UNTRACED_EVIDENCE_CLAIM', rule: 'S4', message: 'Evidence/claim payload appears without trace-event linkage.' }));

const allViolations = [...hardViolations, ...softWarnings];
const currentViolationSignatures = allViolations.map(buildViolationSignature);
const previousViolationSignatures = readLastHistorySignatures();
const newViolations = allViolations.filter((v) => !previousViolationSignatures.has(buildViolationSignature(v)));
const existingViolations = allViolations.filter((v) => previousViolationSignatures.has(buildViolationSignature(v)));

const hardNew = newViolations.filter((v) => v.rule?.startsWith('H')).length;
const softNew = newViolations.filter((v) => v.rule?.startsWith('S')).length;
const softNewCapped = Math.min(5, softNew);
const architecturalDeltas = mode === 'pr' ? Math.min(20, Math.max(0, scannedFiles.length - canonicalFiles.length)) : 10;
const determinismFlags = hardViolations.filter((v) => v.rule === 'H3').length * 8;
const debtCarryover = Math.min(10, existingViolations.length);

const marketDrift = Math.min(25, newViolations.filter((v) => v.rule === 'H1').length * 12 + newViolations.filter((v) => v.rule === 'S1').length * 4);
const flowDrift = Math.min(25, newViolations.filter((v) => v.rule === 'H2' || v.rule === 'H4').length * 12 + architecturalDeltas);
const detDrift = Math.min(25, newViolations.filter((v) => v.rule === 'H3').length * 12 + determinismFlags);
const obsDrift = Math.min(25, newViolations.filter((v) => v.rule === 'S4').length * 5 + softNewCapped * 2);
const categoryScores = {
  market_discipline_drift: marketDrift,
  flow_integrity_drift: flowDrift,
  determinism_reproducibility_drift: detDrift,
  observability_measurement_drift: obsDrift,
};
const driftScoreTotal = Math.min(100, hardNew * 16 + softNewCapped * 2 + architecturalDeltas + determinismFlags + debtCarryover);

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
  write(baselinePath, `${JSON.stringify(archState, null, 2)}\n`);
} else if (!fileExists(baselinePath)) {
  console.error('Missing docs/ria/ARCH_BASELINE.json. Regenerate manually with RIA_MODE=baseline RIA_ALLOW_BASELINE=1 and commit tag "ria: update baseline".');
  process.exit(2);
}

if (shouldPersistState) {
  write('docs/ria/ARCH_STATE.json', `${JSON.stringify(archState, null, 2)}\n`);
}

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
  new_violations_count: newViolations.length,
  existing_violations_count: existingViolations.length,
  violation_signatures: currentViolationSignatures,
  top_violation_signatures: topViolations,
};
if (shouldPersistState) {
  fs.appendFileSync(path.join(repoRoot, 'docs/ria/DRIFT_HISTORY.jsonl'), `${JSON.stringify(historyLine)}\n`);
}

const hardSection = hardViolations.length
  ? hardViolations.map((v) => `- [${v.rule}] ${v.message} (${v.file}:${v.line})`).join('\n')
  : '- None';
const softSection = softWarnings.length
  ? softWarnings.map((v) => `- [${v.rule}] ${v.message}${v.file ? ` (${v.file}:${v.line})` : ''}`).join('\n')
  : '- None';

const recommendedAction = hardViolations.length > 0 || driftScoreTotal >= 60 ? 'FAIL' : driftScoreTotal >= 35 ? 'WARN' : 'PASS';

const newViolationList = newViolations.length
  ? newViolations.slice(0, 5).map((v) => `- ${buildViolationSignature(v)}`).join('\n')
  : '- None';

const report = `# RIA Report

## CI Summary
- Drift total: **${driftScoreTotal}/100**
- Drift breakdown: market=${categoryScores.market_discipline_drift}, flow=${categoryScores.flow_integrity_drift}, determinism=${categoryScores.determinism_reproducibility_drift}, observability=${categoryScores.observability_measurement_drift}
- Hard fails: **${hardViolations.length}**
- New violations (top 5):
${newViolationList}
- Suggested fix focus: ${recommendedAction === 'FAIL' ? 'Address hard violations first, then rerun RIA.' : 'Address top new signatures and monitor trend.'}

## Executive summary
- Mode: ${mode}
- Drift total: **${driftScoreTotal}/100**
- Hard violations: **${hardViolations.length}**
- Soft warnings: **${softWarnings.length}**

## Drift score breakdown
- Market Discipline Drift: ${categoryScores.market_discipline_drift}/25
- Flow Integrity Drift: ${categoryScores.flow_integrity_drift}/25
- Determinism & Reproducibility Drift: ${categoryScores.determinism_reproducibility_drift}/25
- Observability & Measurement Drift: ${categoryScores.observability_measurement_drift}/25

## Repo flow map
- ingestion → normalization → snapshot → persistence → measurement → UI replay

## Hard violations
${hardSection}

## Soft warnings
${softSection}

## Suggested fixes
- Route market parsing through \`asMarketType(value, fallback)\` and use MarketType label mappings in UX.
- Ensure all persisted leg/recommendation records include \`marketType\`.
- Remove nondeterministic snapshot behavior or introduce deterministic seed controls.
- Add prop workflow tests for fallback, matchup/injury note surfacing, and market-scoped persistence.

## PR-specific notes
${mode === 'pr' ? `- Deep scan applied to changed files (${scannedFiles.length}) and canonical architecture files; full-repo scan avoided unless explicit full/baseline mode is selected.` : '- Full repository scan performed.'}

## Next Invariants
- Promote repeated warning signatures to hard rules if they recur over 3+ runs.
`;

if (shouldPersistState) {
  write('docs/ria/RIA_REPORT.md', report);
}

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
