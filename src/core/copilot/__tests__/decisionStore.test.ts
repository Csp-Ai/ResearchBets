/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  fingerprintCopilotTicket,
  listCopilotDecisions,
  saveCopilotDecision,
} from '@/src/core/copilot/decisionStore';
import { buildBuildCopilotRead } from '@/src/core/copilot/buildDecision';
import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

const legs: SlipBuilderLeg[] = [
  {
    id: 'leg-1',
    player: 'Player A',
    marketType: 'receiving_yards',
    line: '40+ receiving yards',
    odds: '-250',
    game: 'A @ B',
  },
];

describe('copilot decision store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('updates the same decision from presented to applied without duplicating history', () => {
    const read = buildBuildCopilotRead({
      legs,
      ideas: [],
      intent: 'best_move',
      marketState: 'unavailable',
    });
    const ticketFingerprint = fingerprintCopilotTicket(legs);

    const presented = saveCopilotDecision({
      traceId: 'trace-1',
      slipId: 'slip-1',
      ticketFingerprint,
      read,
      state: 'presented',
      at: '2026-09-20T20:00:00.000Z',
    });

    const applied = saveCopilotDecision({
      traceId: 'trace-1',
      slipId: 'slip-1',
      ticketFingerprint,
      read,
      state: 'applied',
      at: '2026-09-20T20:01:00.000Z',
    });

    expect(applied.decisionId).toBe(presented.decisionId);
    expect(applied.createdAt).toBe('2026-09-20T20:00:00.000Z');
    expect(applied.updatedAt).toBe('2026-09-20T20:01:00.000Z');
    expect(applied.state).toBe('applied');

    const records = listCopilotDecisions({ traceId: 'trace-1', slipId: 'slip-1' });
    expect(records).toHaveLength(1);
    expect(records[0]?.state).toBe('applied');
    expect(records[0]?.ticketFingerprint).toBe(ticketFingerprint);
  });

  it('keeps different ticket fingerprints as separate decisions on the same trace', () => {
    const firstRead = buildBuildCopilotRead({
      legs,
      ideas: [],
      intent: 'explain_ticket',
      marketState: 'unavailable',
    });
    const nextLegs = [{ ...legs[0]!, line: '50+ receiving yards' }];
    const nextRead = buildBuildCopilotRead({
      legs: nextLegs,
      ideas: [],
      intent: 'explain_ticket',
      marketState: 'unavailable',
    });

    saveCopilotDecision({
      traceId: 'trace-2',
      slipId: 'slip-2',
      ticketFingerprint: fingerprintCopilotTicket(legs),
      read: firstRead,
    });
    saveCopilotDecision({
      traceId: 'trace-2',
      slipId: 'slip-2',
      ticketFingerprint: fingerprintCopilotTicket(nextLegs),
      read: nextRead,
    });

    expect(listCopilotDecisions({ traceId: 'trace-2' })).toHaveLength(2);
  });
});
