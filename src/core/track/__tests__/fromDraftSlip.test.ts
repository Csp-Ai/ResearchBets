import { describe, expect, it } from 'vitest';

import type { DraftSlipState } from '@/src/core/slips/draftSlipStore';
import { draftSlipToTrackedTicket } from '@/src/core/track/fromDraftSlip';

const baseDraft: DraftSlipState = {
  slip_id: 'slip-123',
  trace_id: 'trace-123',
  legs: [
    {
      id: 'leg-1',
      player: 'Justin Jefferson',
      marketType: 'receiving_yards',
      line: '60+ receiving yards',
      odds: '-300',
      game: 'GB @ MIN',
    },
    {
      id: 'leg-2',
      player: 'Jordan Mason',
      marketType: 'rushing_yards',
      line: '40+ rushing yards',
      odds: '-250',
      game: 'GB @ MIN',
    },
  ],
};

const spine = {
  sport: 'NFL',
  tz: 'America/Phoenix',
  date: '2026-09-13',
  mode: 'live' as const,
  trace_id: 'trace-spine',
};

describe('draftSlipToTrackedTicket', () => {
  it('keeps draft identity and normalizes NFL legs for live tracking', () => {
    const ticket = draftSlipToTrackedTicket({
      draft: baseDraft,
      spine,
      now: '2026-09-13T22:30:00.000Z',
    });

    expect(ticket.ticketId).toBe('ticket_slip-123');
    expect(ticket.trace_id).toBe('trace-123');
    expect(ticket.slip_id).toBe('slip-123');
    expect(ticket.mode).toBe('live');
    expect(ticket.legs).toHaveLength(2);
    expect(ticket.legs[0]).toMatchObject({
      league: 'NFL',
      marketType: 'receiving_yards',
      threshold: 60,
      direction: 'over',
      gameId: 'GB @ MIN',
    });
    expect(ticket.provenance).toMatchObject({
      source_type: 'board_staged',
      review_state: 'reviewed',
    });
  });

  it('preserves parser-derived trust state when a screenshot leg needs review', () => {
    const ticket = draftSlipToTrackedTicket({
      draft: {
        ...baseDraft,
        legs: [
          {
            ...baseDraft.legs[0]!,
            deadLegRisk: 'high',
            deadLegReasons: ['Parser marked this leg for review before trust.'],
          },
        ],
      },
      spine,
      now: '2026-09-13T22:30:00.000Z',
    });

    expect(ticket.sourceHint).toBe('screenshot');
    expect(ticket.provenance).toMatchObject({
      source_type: 'parser_derived',
      review_state: 'unreviewed',
    });
    expect(ticket.legs[0]).toMatchObject({
      source: 'xray_parser',
      parseConfidence: 'low',
      needsReview: true,
    });
  });

  it('normalizes anytime touchdown drafts to a threshold of one', () => {
    const ticket = draftSlipToTrackedTicket({
      draft: {
        legs: [
          {
            id: 'td',
            player: 'DeVon Achane',
            marketType: 'anytime_td',
            line: 'Anytime TD',
            odds: '+125',
            game: 'MIA @ LV',
          },
        ],
      },
      spine,
      now: '2026-09-13T22:30:00.000Z',
    });

    expect(ticket.legs[0]?.threshold).toBe(1);
    expect(ticket.ticketId).toMatch(/^ticket_draft_/);
  });
});
