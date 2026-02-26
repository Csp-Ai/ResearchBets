import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { EventEnvelopeSchema, SlipExtractResultSchema, SlipSubmitResultSchema, TodayPayloadSchema } from '../src/core/contracts/envelopes.ts';

const schemaChecks = [
  ['TodayPayloadSchema', () => TodayPayloadSchema.parse({ mode: 'demo', games: [{ id: 'g1', matchup: 'A @ B', startTime: new Date().toISOString() }], board: [{ id: 'p1', gameId: 'g1', player: 'P', market: 'points', line: '20.5', odds: '-110' }] })],
  ['SlipSubmitResultSchema', () => SlipSubmitResultSchema.parse({ slip_id: '00000000-0000-0000-0000-000000000000', trace_id: 't1', anon_id: 'anon', spine: {}, trace: {}, parse: { confidence: 0.8, legs_count: 1, needs_review: false } })],
  ['SlipExtractResultSchema', () => SlipExtractResultSchema.parse({ slip_id: '00000000-0000-0000-0000-000000000000', extracted_legs: [], leg_insights: [], trace_id: 't1' })],
  ['EventEnvelopeSchema', () => EventEnvelopeSchema.parse({ trace_id: 't1', phase: 'DURING', type: 'probe', payload: {}, timestamp: new Date().toISOString() })],
];
for (const [name, run] of schemaChecks) { run(); console.log(`schema ok: ${name}`); }

const fileList = execSync("rg --files app src -g '*.{ts,tsx}'", { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const clientFiles = fileList.filter((path) => {
  const text = readFileSync(path, 'utf8');
  return text.includes("'use client'") || text.includes('"use client"');
});
const importPattern = /from\s+['\"]([^'\"]+)['\"]/g;
const knownViolations = new Set(['src/components/research/LiveTabPanel.tsx','src/components/research/ResearchPageContent.tsx','src/components/research/ScoutTabPanel.tsx']);
const violations = [];
for (const file of clientFiles) {
  const text = readFileSync(file, 'utf8');
  const imports = [...text.matchAll(importPattern)].map((m) => m[1]);
  if (imports.some((value) => value?.includes('.server') || value?.endsWith('/server') || value === 'server-only')) {
    violations.push(file);
  }
}
const newViolations = violations.filter((v) => !knownViolations.has(v));
if (newViolations.length > 0) throw new Error(`client/server boundary violations: ${newViolations.join(', ')}`);
if (violations.length > 0) console.warn(`known boundary violations tolerated: ${violations.join(', ')}`);
console.log('boundary ok');

const runtimeServerText = readFileSync('src/core/env/runtime.server.ts', 'utf8');
if (!(runtimeServerText.includes('export const runtimeFlags') && runtimeServerText.includes('liveModeEnabled') && runtimeServerText.includes('providersConfigured') && runtimeServerText.includes('demoModeDefault'))) {
  throw new Error('runtimeFlags shape invalid');
}
console.log('runtimeFlags ok');
