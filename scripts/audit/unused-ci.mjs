#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';

const baselinePath = 'docs/audits/knip-baseline.json';

function runKnip() {
  const proc = spawnSync('npx', ['knip', '--reporter', 'json'], { encoding: 'utf8' });
  if (!proc.stdout) {
    throw new Error(proc.stderr || 'knip did not return JSON output');
  }
  return JSON.parse(proc.stdout);
}

function toSet(report) {
  const files = (report.files ?? []).map((item) => `file:${item}`);
  const issues = (report.issues ?? []).flatMap((issue) => {
    const rows = [];
    for (const [key, value] of Object.entries(issue)) {
      if (!Array.isArray(value) || value.length === 0 || key === 'file') continue;
      if (key === 'duplicates') rows.push(`issue:${issue.file}:duplicates`);
      else rows.push(...value.map((entry) => `issue:${issue.file}:${key}:${entry.name ?? JSON.stringify(entry)}`));
    }
    return rows;
  });
  return new Set([...files, ...issues]);
}

const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
const current = runKnip();

const baselineSet = toSet(baseline);
const currentSet = toSet(current);

const added = [...currentSet].filter((row) => !baselineSet.has(row));
if (added.length > 0) {
  console.error('❌ New unused-code findings exceeded baseline:');
  added.slice(0, 200).forEach((row) => console.error(` - ${row}`));
  process.exit(1);
}

console.log('✅ Unused-code CI check passed (no findings above baseline).');
