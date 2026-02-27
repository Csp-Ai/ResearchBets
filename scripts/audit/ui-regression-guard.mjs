import fs from 'node:fs';

const checks = [
  {
    file: 'app/page.tsx',
    failIfIncludes: '<PostmortemUploadWedge />',
    message: 'Raw JSX leak token found in home page source.'
  }
];

let failed = false;
for (const check of checks) {
  const text = fs.readFileSync(check.file, 'utf8');
  if (text.includes(check.failIfIncludes)) {
    failed = true;
    console.error(`[ui-regression-guard] ${check.message} (${check.file})`);
  }
}

const stress = fs.readFileSync('src/components/research/ResearchPageContent.tsx', 'utf8');
const analyze = fs.readFileSync('src/components/research/AnalyzeTabPanel.tsx', 'utf8');
const headingCount = (stress.match(/title="Stress Test"/g) ?? []).length + (analyze.match(/>Stress Test</g) ?? []).length;
if (headingCount !== 1) {
  failed = true;
  console.error(`[ui-regression-guard] Expected exactly one Stress Test heading surface, found ${headingCount}.`);
}

if (failed) process.exit(1);
console.log('[ui-regression-guard] OK');
