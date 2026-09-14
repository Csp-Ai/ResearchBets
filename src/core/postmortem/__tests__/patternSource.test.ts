/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';

import { listLearningArtifacts } from '@/src/core/postmortem/patternSource';
import { savePostmortem } from '@/src/core/review/store';

describe('patternSource personal-learning boundary', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('does not treat the review-store demo fallback as bettor history', () => {
    expect(listLearningArtifacts()).toEqual([]);
  });

  it('learns from an actually persisted settled ticket', () => {
    savePostmortem({
      ticketId: 'real-ticket-1',
      createdAt: '2026-09-14T18:00:00.000Z',
      settledAt: '2026-09-14T21:00:00.000Z',
      status: 'lost',
      legs: [
        {
          legId: 'leg-1',
          player: 'Real Player',
          statType: 'receiving_yards',
          target: 60,
          finalValue: 51,
          delta: -9,
          hit: false,
          missTags: ['line_too_high'],
          missNarrative: 'The posted target did not clear.',
          lessonHint: 'Use a lower alternate threshold next time.',
        },
        {
          legId: 'leg-2',
          player: 'Second Player',
          statType: 'rushing_yards',
          target: 50,
          finalValue: 63,
          delta: 13,
          hit: true,
          missTags: [],
          missNarrative: '',
          lessonHint: '',
        },
      ],
      coverage: { level: 'full', reasons: [] },
      fragility: { score: 58, chips: ['Threshold pressure'] },
      narrative: ['One pushed line broke the ticket.'],
    });

    const artifacts = listLearningArtifacts();
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.ticket_id).toBe('real-ticket-1');
    expect(artifacts[0]?.source).toBe('settled_postmortem');
  });
});
