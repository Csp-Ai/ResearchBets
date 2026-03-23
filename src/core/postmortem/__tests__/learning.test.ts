import { describe, expect, it } from 'vitest';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import {
  buildDraftLearningAdvisory,
  extractLearningArtifactFromPostmortem,
  extractLearningArtifactFromReviewedRecord,
  inferDraftLearningProfile,
  type SettledLearningArtifact
} from '@/src/core/postmortem/learning';
import type { ReviewedAttributionRecord } from '@/src/core/postmortem/patterns';
import type { PostmortemRecord } from '@/src/core/review/types';

function makePostmortem(overrides: Partial<PostmortemRecord> = {}): PostmortemRecord {
  return {
    ticketId: overrides.ticketId ?? 'ticket-1',
    trace_id: overrides.trace_id ?? 'trace-1',
    slip_id: overrides.slip_id ?? 'slip-1',
    run_id: overrides.run_id,
    provenance: overrides.provenance,
    createdAt: overrides.createdAt ?? '2026-03-20T00:00:00.000Z',
    settledAt: overrides.settledAt ?? '2026-03-20T03:00:00.000Z',
    status: overrides.status ?? 'lost',
    cashoutTaken: overrides.cashoutTaken,
    legs: overrides.legs ?? [
      {
        legId: 'leg-1',
        player: 'Player A',
        statType: 'points',
        target: 31.5,
        finalValue: 28,
        delta: -3.5,
        hit: false,
        missTags: ['bust_by_one'],
        missNarrative: 'Missed a long ladder.',
        lessonHint: 'One long ladder carried too much of the slip.'
      },
      {
        legId: 'leg-2',
        player: 'Player B',
        statType: 'threes',
        target: 4.5,
        finalValue: 3,
        delta: -1.5,
        hit: false,
        missTags: ['ladder_miss'],
        missNarrative: 'Threes ladder missed.',
        lessonHint: 'Both misses needed an aggressive script.'
      }
    ],
    coverage: overrides.coverage ?? { level: 'full', reasons: [] },
    fragility: overrides.fragility ?? { score: 72, chips: ['Ladder distance'] },
    narrative: overrides.narrative ?? ['Ticket lost on two stretched overs.'],
    coachSnapshot: overrides.coachSnapshot,
    nextTimeRule: overrides.nextTimeRule
  };
}

function makeReviewedRecord(
  overrides: Partial<ReviewedAttributionRecord> = {}
): ReviewedAttributionRecord {
  return {
    trace_id: overrides.trace_id ?? 'trace-reviewed',
    slip_id: overrides.slip_id ?? 'slip-reviewed',
    reviewed_at: overrides.reviewed_at ?? '2026-03-21T00:00:00.000Z',
    outcome: overrides.outcome ?? 'loss',
    cause_tags: overrides.cause_tags ?? ['correlated_legs'],
    confidence_level: overrides.confidence_level ?? 'medium',
    weakest_leg: overrides.weakest_leg ?? {
      leg_id: 'leg-reviewed',
      player: 'Player C',
      prop_type: 'assists',
      status: 'miss'
    },
    source_type: overrides.source_type ?? 'pasted_text',
    parse_status: overrides.parse_status ?? 'success'
  };
}

function makeSlip(overrides: Partial<SlipBuilderLeg> = {}): SlipBuilderLeg {
  return {
    id: overrides.id ?? 'draft-1',
    player: overrides.player ?? 'Player A',
    marketType: overrides.marketType ?? 'points',
    line: overrides.line ?? '30.5',
    odds: overrides.odds,
    confidence: overrides.confidence,
    volatility: overrides.volatility,
    game: overrides.game ?? 'A @ B',
    deadLegRisk: overrides.deadLegRisk,
    deadLegReasons: overrides.deadLegReasons
  };
}

describe('extractLearningArtifactFromPostmortem', () => {
  it('extracts an explainable loss artifact from settled postmortem data', () => {
    const artifact = extractLearningArtifactFromPostmortem(makePostmortem());

    expect(artifact.outcome_category).toBe('loss');
    expect(artifact.breaking_pattern).toBe('inflated_threshold');
    expect(artifact.failure_pattern).toBe('inflated_threshold');
    expect(artifact.takeaway).toMatch(/threshold/i);
    expect(artifact.confidence_band).toBe('medium');
  });

  it('lowers confidence and suppresses forced failure labels on void-heavy outcomes', () => {
    const artifact = extractLearningArtifactFromPostmortem(
      makePostmortem({
        status: 'void',
        legs: [
          {
            legId: 'leg-1',
            player: 'Player A',
            statType: 'points',
            target: 22.5,
            finalValue: 22.5,
            delta: 0,
            hit: true,
            missTags: [],
            missNarrative: 'Voided leg.',
            lessonHint: 'No clean lesson.'
          }
        ]
      })
    );

    expect(artifact.outcome_category).toBe('void');
    expect(artifact.confidence_band).toBe('low');
  });

  it('maps reviewed attribution records into the same compact learning artifact shape', () => {
    const artifact = extractLearningArtifactFromReviewedRecord(
      makeReviewedRecord({
        cause_tags: ['correlated_legs', 'late_game_inactivity'],
        weakest_leg: { leg_id: 'leg-1', player: 'Player C', prop_type: 'assists', status: 'miss' }
      })
    );

    expect(artifact.source).toBe('reviewed_postmortem');
    expect(artifact.breaking_pattern).toBe('overstacked_correlation');
    expect(artifact.match_profile.correlatedStructure).toBe(true);
  });
});

describe('buildDraftLearningAdvisory', () => {
  it('returns null when similar settled history is insufficient', () => {
    const advisory = buildDraftLearningAdvisory(
      [extractLearningArtifactFromPostmortem(makePostmortem())],
      [makeSlip()]
    );

    expect(advisory).toBeNull();
  });

  it('builds a compact advisory when similar wins and losses repeat the same patterns', () => {
    const artifacts: SettledLearningArtifact[] = [
      {
        ...extractLearningArtifactFromPostmortem(
          makePostmortem({
            ticketId: 'ticket-win-1',
            status: 'won',
            legs: [
              {
                legId: 'leg-1',
                player: 'Player A',
                statType: 'points',
                target: 24.5,
                finalValue: 28,
                delta: 3.5,
                hit: true,
                missTags: [],
                missNarrative: 'Cleared.',
                lessonHint: 'Compact ticket.'
              },
              {
                legId: 'leg-2',
                player: 'Player B',
                statType: 'rebounds',
                target: 8.5,
                finalValue: 10,
                delta: 1.5,
                hit: true,
                missTags: [],
                missNarrative: 'Cleared.',
                lessonHint: 'Independent script.'
              }
            ]
          })
        ),
        strongest_winning_pattern: 'balanced_thresholds'
      },
      extractLearningArtifactFromPostmortem(makePostmortem({ ticketId: 'ticket-loss-1' })),
      extractLearningArtifactFromPostmortem(
        makePostmortem({
          ticketId: 'ticket-loss-2',
          settledAt: '2026-03-19T03:00:00.000Z'
        })
      )
    ];

    const advisory = buildDraftLearningAdvisory(artifacts, [
      makeSlip({ id: '1', player: 'Player A', marketType: 'points', line: '30.5', game: 'A @ B' }),
      makeSlip({ id: '2', player: 'Player B', marketType: 'threes', line: '4.5', game: 'C @ D' })
    ]);

    expect(advisory).not.toBeNull();
    expect(advisory?.strongest_repeated_success).toMatch(/thresholds|compact/i);
    expect(advisory?.repeated_break_pattern).toMatch(/inflated thresholds/i);
    expect(advisory?.watch_note).toMatch(/longest line/i);
    expect(advisory?.sample_size).toBe(3);
  });

  it('handles conflicting lessons by staying deterministic and still surfacing the top repeated break', () => {
    const artifacts = [
      extractLearningArtifactFromPostmortem(makePostmortem({ ticketId: 'a' })),
      extractLearningArtifactFromPostmortem(makePostmortem({ ticketId: 'b' })),
      extractLearningArtifactFromReviewedRecord(
        makeReviewedRecord({
          trace_id: 'c',
          cause_tags: ['correlated_legs'],
          weakest_leg: { leg_id: 'leg-c', player: 'Player C', prop_type: 'assists', status: 'miss' }
        })
      )
    ];

    const advisory = buildDraftLearningAdvisory(artifacts, [
      makeSlip({ id: '1', player: 'Player A', marketType: 'points', line: '31.5', game: 'A @ B' }),
      makeSlip({ id: '2', player: 'Player B', marketType: 'assists', line: '8.5', game: 'C @ D' })
    ]);

    expect(advisory?.repeated_break_pattern).toMatch(/inflated thresholds/i);
  });

  it('detects repeated single-leg dependency when one breaker decides similar slips', () => {
    const artifacts = [
      extractLearningArtifactFromPostmortem(
        makePostmortem({
          ticketId: 'solo-1',
          legs: [
            {
              legId: 'leg-1',
              player: 'Player A',
              statType: 'points',
              target: 29.5,
              finalValue: 27,
              delta: -2.5,
              hit: false,
              missTags: [],
              missNarrative: 'Single breaker.',
              lessonHint: 'One leg carried too much of the slip.'
            },
            {
              legId: 'leg-2',
              player: 'Player B',
              statType: 'rebounds',
              target: 7.5,
              finalValue: 9,
              delta: 1.5,
              hit: true,
              missTags: [],
              missNarrative: 'Cleared.',
              lessonHint: 'Support leg got home.'
            }
          ]
        })
      ),
      extractLearningArtifactFromPostmortem(
        makePostmortem({
          ticketId: 'solo-2',
          settledAt: '2026-03-19T03:00:00.000Z',
          legs: [
            {
              legId: 'leg-3',
              player: 'Player C',
              statType: 'points',
              target: 28.5,
              finalValue: 25,
              delta: -3.5,
              hit: false,
              missTags: [],
              missNarrative: 'Single breaker.',
              lessonHint: 'One miss ended the ticket.'
            },
            {
              legId: 'leg-4',
              player: 'Player D',
              statType: 'rebounds',
              target: 8.5,
              finalValue: 9,
              delta: 0.5,
              hit: true,
              missTags: [],
              missNarrative: 'Cleared.',
              lessonHint: 'Support leg got home.'
            }
          ]
        })
      )
    ];

    const advisory = buildDraftLearningAdvisory(artifacts, [
      makeSlip({ id: '1', player: 'Player A', marketType: 'points', line: '29.5', game: 'A @ B' }),
      makeSlip({ id: '2', player: 'Player B', marketType: 'rebounds', line: '8.5', game: 'C @ D' })
    ]);

    expect(advisory?.repeated_break_pattern).toMatch(/one leg deciding too much/i);
  });

  it('keeps all-win history advisory-only and avoids inventing a failure pattern', () => {
    const artifacts = [
      extractLearningArtifactFromPostmortem(
        makePostmortem({
          ticketId: 'win-1',
          status: 'won',
          legs: [
            {
              legId: 'leg-1',
              player: 'Player A',
              statType: 'points',
              target: 24.5,
              finalValue: 27,
              delta: 2.5,
              hit: true,
              missTags: [],
              missNarrative: 'Cleared.',
              lessonHint: 'Compact ticket.'
            },
            {
              legId: 'leg-2',
              player: 'Player B',
              statType: 'rebounds',
              target: 8.5,
              finalValue: 10,
              delta: 1.5,
              hit: true,
              missTags: [],
              missNarrative: 'Cleared.',
              lessonHint: 'Independent script.'
            }
          ]
        })
      ),
      extractLearningArtifactFromPostmortem(
        makePostmortem({
          ticketId: 'win-2',
          status: 'won',
          settledAt: '2026-03-19T03:00:00.000Z',
          legs: [
            {
              legId: 'leg-3',
              player: 'Player C',
              statType: 'points',
              target: 25.5,
              finalValue: 29,
              delta: 3.5,
              hit: true,
              missTags: [],
              missNarrative: 'Cleared.',
              lessonHint: 'Compact ticket.'
            },
            {
              legId: 'leg-4',
              player: 'Player D',
              statType: 'rebounds',
              target: 7.5,
              finalValue: 9,
              delta: 1.5,
              hit: true,
              missTags: [],
              missNarrative: 'Cleared.',
              lessonHint: 'Independent script.'
            }
          ]
        })
      )
    ];

    const advisory = buildDraftLearningAdvisory(artifacts, [
      makeSlip({ id: '1', player: 'Player A', marketType: 'points', line: '24.5', game: 'A @ B' }),
      makeSlip({ id: '2', player: 'Player B', marketType: 'rebounds', line: '8.5', game: 'C @ D' })
    ]);

    expect(advisory?.strongest_repeated_success).toMatch(/similar wins/i);
    expect(advisory?.repeated_break_pattern).toMatch(/no repeated break pattern/i);
  });

  it('suppresses low-confidence push or void-heavy history', () => {
    const advisory = buildDraftLearningAdvisory(
      [
        extractLearningArtifactFromReviewedRecord(
          makeReviewedRecord({ outcome: 'push', confidence_level: 'low' })
        ),
        extractLearningArtifactFromPostmortem(makePostmortem({ status: 'void' }))
      ],
      [makeSlip({ marketType: 'assists', line: '8.5' })]
    );

    expect(advisory).toBeNull();
  });

  it('builds inspectable draft match profiles deterministically', () => {
    expect(
      inferDraftLearningProfile([
        makeSlip({
          marketType: 'assists',
          line: '9.5',
          game: 'A @ B',
          deadLegReasons: ['late game risk']
        }),
        makeSlip({ marketType: 'rebounds', line: '11.5', game: 'A @ B' })
      ])
    ).toMatchObject({
      statFamily: 'secondary_volatility',
      correlatedStructure: true,
      volatileSecondaryStats: true,
      lateGameDependency: true
    });
  });
});
