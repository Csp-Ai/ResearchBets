#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';

const outPath = 'docs/audits/knip-report.json';

function runKnip() {
  const proc = spawnSync('npx', ['knip', '--reporter', 'json'], { encoding: 'utf8' });
  if (!proc.stdout) {
    throw new Error(proc.stderr || 'knip did not return JSON output');
  }
  return JSON.parse(proc.stdout);
}

const report = runKnip();
await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote Knip report to ${outPath}`);
console.log(`Unused files: ${report.files?.length ?? 0}`);
console.log(`Issue files: ${report.issues?.length ?? 0}`);
