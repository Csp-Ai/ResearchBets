import { describe, expect, it } from 'vitest';

import { computeCalibrationMetricsFromOutcomes } from '@/src/core/metrics/calibrationEngine';
import type { SlipOutcomeRecord } from '@/src/core/persistence/runtimeStore';

const sample = (patch: Partial<SlipOutcomeRecord>): SlipOutcomeRecord => ({
  id: patch.id ?? 'o-1',
  traceId: patch.traceId ?? 't-1',
  runId: patch.runId ?? 'r-1',
  userId: patch.userId ?? null,
  verdictInternal: patch.verdictInternal ?? 'KEEP',
  verdictPresented: patch.verdictPresented ?? 'TAKE',
  confidenceScore: patch.confidenceScore ?? 70,
  fragilityScore: patch.fragilityScore ?? 40,
  correlationScore: patch.correlationScore ?? 40,
  weakestLeg: patch.weakestLeg ?? 'Leg A',
  topReasons: patch.topReasons ?? [],
  finalOutcome: patch.finalOutcome ?? 'WIN',
  hitWeakestLeg: patch.hitWeakestLeg ?? false,
  verdictCorrect: patch.verdictCorrect ?? true,
  createdAt: patch.createdAt ?? '2026-01-01T00:00:00.000Z'
});

describe('computeCalibrationMetricsFromOutcomes', () => {
  it('returns deterministic fallback when no outcomes exist', () => {
    const metrics = computeCalibrationMetricsFromOutcomes([]);
    expect(metrics.runs_analyzed).toBe(0);
    expect(metrics.take_accuracy).toBe(0);
    expect(metrics.confidence_bucket_accuracy).toHaveLength(10);
  });

  it('computes take, modify, weakest-leg metrics and verdict breakdown', () => {
    const metrics = computeCalibrationMetricsFromOutcomes([
      sample({ id: '1', verdictPresented: 'TAKE', finalOutcome: 'WIN', verdictCorrect: true, hitWeakestLeg: true }),
      sample({ id: '2', verdictPresented: 'TAKE', finalOutcome: 'LOSS', verdictCorrect: false }),
      sample({ id: '3', verdictPresented: 'MODIFY', finalOutcome: 'LOSS', verdictCorrect: true, fragilityScore: 70 }),
      sample({ id: '4', verdictPresented: 'PASS', finalOutcome: 'WIN', verdictCorrect: false, correlationScore: 70 })
    ]);

    expect(metrics.take_accuracy).toBe(0.5);
    expect(metrics.modify_prevented_rate).toBe(1);
    expect(metrics.weakest_leg_accuracy).toBe(0.25);
    expect(metrics.verdict_accuracy_by_type).toEqual({ TAKE: 0.5, MODIFY: 1, PASS: 0 });
  });

  it('groups confidence into 10% buckets', () => {
    const metrics = computeCalibrationMetricsFromOutcomes([
      sample({ id: '1', confidenceScore: 9, finalOutcome: 'LOSS', verdictCorrect: true }),
      sample({ id: '2', confidenceScore: 15, finalOutcome: 'WIN', verdictCorrect: true }),
      sample({ id: '3', confidenceScore: 82, finalOutcome: 'WIN', verdictCorrect: true })
    ]);

    const bucket0 = metrics.confidence_bucket_accuracy.find((bucket) => bucket.range === '0-9%');
    const bucket10 = metrics.confidence_bucket_accuracy.find((bucket) => bucket.range === '10-19%');
    const bucket80 = metrics.confidence_bucket_accuracy.find((bucket) => bucket.range === '80-89%');

    expect(bucket0?.count).toBe(1);
    expect(bucket10?.count).toBe(1);
    expect(bucket80?.count).toBe(1);
  });
});
