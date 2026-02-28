import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { parseSlipTextToLegs } from '@/src/core/track/slipParser';
import type { TrackedTicket } from '@/src/core/track/types';

const schema = z.object({
  text: z.string().trim().min(1),
  sourceHint: z.string().trim().min(1).optional(),
});

function buildTicketId(raw: string, createdAt: string) {
  const digest = createHash('sha256').update(`${raw}:${createdAt}`).digest('hex');
  return `ticket_${digest.slice(0, 12)}`;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'invalid_payload', message: 'Expected non-empty text.' } }, { status: 400 });
  }

  const createdAt = new Date().toISOString();
  const sourceHint = parsed.data.sourceHint ?? 'paste';

  const ticket: TrackedTicket = {
    ticketId: buildTicketId(parsed.data.text, createdAt),
    createdAt,
    rawSlipText: parsed.data.text,
    sourceHint,
    legs: parseSlipTextToLegs(parsed.data.text, sourceHint),
  };

  return NextResponse.json({ ok: true, data: ticket });
}
