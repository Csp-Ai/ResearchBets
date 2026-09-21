import { describe, expect, it } from 'vitest';

import { ControlPlaneEventSchema } from '@/src/core/control-plane/events';

const base = {
  timestamp: '2026-09-21T01:00:00.000Z',
  request_id: 'request-1',
  trace_id: 'trace-1',
  agent_id: 'build_decision_copilot',
  model_version: 'build-copilot-v1',
  mode: 'live' as const,
  properties: {
    decision_id: 'copilot:trace-1:best_move:abc:xray',
    intent: 'best_move',
    ticket_fingerprint: 'abc',
    evidence_state: 'verified_market',
    action_kind: 'xray',
  },
};

describe('Copilot control-plane events', () => {
  it('accepts a presented decision with the required lineage properties', () => {
    const parsed = ControlPlaneEventSchema.safeParse({
      ...base,
      event_name: 'copilot_decision_presented',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts an applied decision with the required lineage properties', () => {
    const parsed = ControlPlaneEventSchema.safeParse({
      ...base,
      event_name: 'copilot_action_applied',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a Copilot decision that omits the ticket fingerprint', () => {
    const { ticket_fingerprint: _removed, ...properties } = base.properties;
    const parsed = ControlPlaneEventSchema.safeParse({
      ...base,
      event_name: 'copilot_decision_presented',
      properties,
    });
    expect(parsed.success).toBe(false);
  });
});
