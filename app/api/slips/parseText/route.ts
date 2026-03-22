import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { buildLoopProvenance } from '@/src/core/bettor-loop/provenance';
import { normalizeLineage } from '@/src/core/lineage/lineage';
import { parseSlipTextToLegs } from '@/src/core/track/slipParser';
import type { TrackedTicket } from '@/src/core/track/types';
import { spineFromRequest } from '@/src/core/contracts/contextSpine';

const schema = z.object({
  text: z.string().trim().min(1),
  sourceHint: z.string().trim().min(1).optional(),
  trace_id: z.string().trim().min(1).optional(),
  anon_session_id: z.string().trim().min(1).optional(),
  slip_id: z.string().trim().min(1).optional()
});

const asTodayMode = (value: unknown): 'live' | 'cache' | 'demo' =>
  value === 'live' || value === 'cache' || value === 'demo' ? value : 'demo';

function buildTicketId(raw: string, createdAt: string) {
  const digest = createHash('sha256').update(`${raw}:${createdAt}`).digest('hex');
  return `ticket_${digest.slice(0, 12)}`;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid_payload', message: 'Expected non-empty text.' } },
      { status: 400 }
    );
  }

  const createdAt = new Date().toISOString();
  const sourceHint = parsed.data.sourceHint ?? 'paste';
  const spine = spineFromRequest(request);
  const traceId = parsed.data.trace_id ?? spine.trace_id;
  const lineage = traceId
    ? normalizeLineage({
        trace_id: traceId,
        ticketId: buildTicketId(parsed.data.text, createdAt),
        anon_session_id: parsed.data.anon_session_id ?? spine.anon_session_id,
        slip_id: parsed.data.slip_id ?? spine.slip_id,
        sport: spine.sport,
        tz: spine.tz,
        date: spine.date,
        mode: spine.mode
      })
    : null;

  const ticket: TrackedTicket = {
    ticketId: lineage?.ticketId ?? buildTicketId(parsed.data.text, createdAt),
    createdAt,
    rawSlipText: parsed.data.text,
    sourceHint,
    legs: parseSlipTextToLegs(parsed.data.text, sourceHint),
    trace_id: lineage?.trace_id,
    run_id: lineage?.run_id,
    slip_id: lineage?.slip_id,
    anon_session_id: lineage?.anon_session_id,
    sport: lineage?.sport,
    tz: lineage?.tz,
    date: lineage?.date,
    mode: asTodayMode(lineage?.mode),
    provenance: buildLoopProvenance({
      mode: asTodayMode(lineage?.mode),
      sourceType:
        sourceHint === 'paste' || sourceHint === 'screenshot' ? 'parser_derived' : 'manual_entry',
      reviewState: 'unreviewed'
    })
  };

  return NextResponse.json({ ok: true, data: ticket });
}
