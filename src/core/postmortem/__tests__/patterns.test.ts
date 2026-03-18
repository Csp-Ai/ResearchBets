import { describe, expect, it } from 'vitest';

import {
  summarizeBettorMistakePatterns,
  toReviewedAttributionRecord,
  type ReviewedAttributionRecord
} from '@/src/core/postmortem/patterns';

function makeRecord(overrides: Partial<ReviewedAttributionRecord> = {}): ReviewedAttributionRecord {
  return {
    trace_id: overrides.trace_id ?? 'trace-default',
    slip_id: overrides.slip_id,
    reviewed_at: overrides.reviewed_at ?? '2026-03-18T00:00:00.000Z',
    outcome: overrides.outcome ?? 'loss',
    cause_tags: overrides.cause_tags ?? ['line_too_aggressive'],
    confidence_level: overrides.confidence_level ?? 'medium',
    weakest_leg: overrides.weakest_leg ?? {
      leg_id: 'leg-1',
      player: 'Player A',
      prop_type: 'points',
      status: 'miss'
    },
    source_type: overrides.source_type ?? 'pasted_text',
    parse_status: overrides.parse_status ?? 'success'
  };
}

describe('summarizeBettorMistakePatterns', () => {
  it('aggregates repeated tags into a compact bettor pattern summary', () => {
    const summary = summarizeBettorMistakePatterns([
      makeRecord({
        trace_id: 't1',
        reviewed_at: '2026-03-18T03:00:00.000Z',
        cause_tags: ['line_too_aggressive', 'blowout_minutes_risk']
      }),
      makeRecord({
        trace_id: 't2',
        reviewed_at: '2026-03-17T03:00:00.000Z',
        cause_tags: ['line_too_aggressive', 'blowout_minutes_risk']
      }),
      makeRecord({
        trace_id: 't3',
        reviewed_at: '2026-03-16T03:00:00.000Z',
        cause_tags: ['line_too_aggressive'],
        weakest_leg: { leg_id: 'leg-3', player: 'Player C', prop_type: 'points', status: 'miss' }
      }),
      makeRecord({
        trace_id: 't4',
        reviewed_at: '2026-03-15T03:00:00.000Z',
        cause_tags: ['correlated_legs']
      })
    ]);

    expect(summary.sample_size).toBe(4);
    expect(summary.recurring_tags[0]).toMatchObject({
      tag: 'line_too_aggressive',
      count: 3,
      percentage: 0.75
    });
    expect(summary.common_failure_mode).toBe('blowout_sensitive_scoring');
    expect(summary.recent_examples).toHaveLength(3);
    expect(summary.recommendation_summary).toMatch(
      /aggressive scoring looks in blowout-sensitive scripts/i
    );
  });

  it('gates low sample histories with low confidence', () => {
    const summary = summarizeBettorMistakePatterns([
      makeRecord({ trace_id: 't1', cause_tags: ['line_too_aggressive'] }),
      makeRecord({ trace_id: 't2', cause_tags: ['line_too_aggressive'] })
    ]);

    expect(summary.sample_size).toBe(2);
    expect(summary.confidence_level).toBe('low');
    expect(summary.common_failure_mode).toBe('insufficient_history');
    expect(summary.recommendation_summary).toMatch(/limited history/i);
  });

  it('assigns high confidence only when history and repetition are strong enough', () => {
    const summary = summarizeBettorMistakePatterns([
      makeRecord({
        trace_id: 't1',
        cause_tags: ['correlated_legs'],
        weakest_leg: { leg_id: '1', player: 'A', prop_type: 'threes', status: 'miss' }
      }),
      makeRecord({
        trace_id: 't2',
        cause_tags: ['correlated_legs'],
        weakest_leg: { leg_id: '2', player: 'B', prop_type: 'threes', status: 'miss' }
      }),
      makeRecord({
        trace_id: 't3',
        cause_tags: ['correlated_legs'],
        weakest_leg: { leg_id: '3', player: 'C', prop_type: 'threes', status: 'miss' }
      }),
      makeRecord({ trace_id: 't4', cause_tags: ['correlated_legs'] }),
      makeRecord({ trace_id: 't5', cause_tags: ['correlated_legs'] }),
      makeRecord({ trace_id: 't6', cause_tags: ['line_too_aggressive', 'correlated_legs'] })
    ]);

    expect(summary.confidence_level).toBe('high');
    expect(summary.common_failure_mode).toBe('correlated_same_script_exposure');
  });

  it('returns truthful no-history output when no reviewed records exist', () => {
    const summary = summarizeBettorMistakePatterns([]);

    expect(summary.sample_size).toBe(0);
    expect(summary.recurring_tags).toEqual([]);
    expect(summary.confidence_level).toBe('low');
    expect(summary.recommendation_summary).toMatch(/no reviewed slip history yet/i);
  });
});

describe('toReviewedAttributionRecord', () => {
  it('skips demo or failed parse reviews so bettor history is not fabricated', () => {
    expect(
      toReviewedAttributionRecord({
        provenance: {
          source_type: 'demo_sample',
          parse_status: 'success',
          parse_confidence: 0.9,
          had_manual_edits: false,
          trace_id: 'trace-demo',
          slip_id: null,
          generated_at: '2026-03-18T00:00:00.000Z'
        },
        postmortem: {
          ok: true,
          trace_id: 'trace-demo',
          attribution: {
            trace_id: 'trace-demo',
            outcome: 'loss',
            cause_tags: ['line_too_aggressive'],
            confidence_level: 'medium',
            summary_explanation: 'x',
            narrative: 'x'
          },
          classification: {
            process: 'x',
            correlationMiss: false,
            injuryImpact: false,
            lineValueMiss: false
          },
          notes: [],
          correlationScore: 0,
          volatilityTier: 'Low',
          exposureSummary: { topGames: [], topPlayers: [] }
        }
      })
    ).toBeNull();
  });
});
