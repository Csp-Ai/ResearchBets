'use client';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { createClientRequestId, ensureAnonSessionId } from '@/src/core/identifiers/session';
import type { QuerySpine } from '@/src/core/nervous/spine';

type SubmitInput = {
  spine: QuerySpine;
  slip: SlipBuilderLeg[];
};

type SubmitResult =
  | { ok: false; reason: 'empty_slip' | 'submit_failed' }
  | { ok: true; slip_id: string; trace_id: string };

export async function submitDraftSlip({ spine, slip }: SubmitInput): Promise<SubmitResult> {
  if (slip.length < 1) return { ok: false, reason: 'empty_slip' };

  const anonSessionId = ensureAnonSessionId();
  const requestId = createClientRequestId();

  const response = await fetch('/api/slips/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anon_id: anonSessionId,
      anon_session_id: anonSessionId,
      request_id: requestId,
      source: 'paste',
      raw_text: slip.map((leg) => `${leg.player} ${leg.marketType} ${leg.line} ${leg.odds ?? ''}`.trim()).join('\n'),
      spine: {
        sport: spine.sport,
        tz: spine.tz,
        date: spine.date,
        mode: spine.mode,
        user_id: null,
        anon_id: anonSessionId
      },
      legs: slip
    })
  });

  if (!response.ok) return { ok: false, reason: 'submit_failed' };
  const payload = (await response.json()) as { slip_id?: string; trace_id?: string };
  if (!payload.slip_id || !payload.trace_id) return { ok: false, reason: 'submit_failed' };
  return { ok: true, slip_id: payload.slip_id, trace_id: payload.trace_id };
}
