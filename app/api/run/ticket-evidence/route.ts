import { NextResponse } from 'next/server';

import { applyRateLimit } from '@/src/core/http/rateLimit';
import { ticketEvidenceRequest } from '@/src/core/run/ticketEvidence';
import { fetchTicketEvidence } from '@/src/core/run/ticketEvidence.server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const limited = applyRateLimit(request, { route: 'run:ticket-evidence', limit: 8 });
  if (limited) return limited;

  const input = ticketEvidenceRequest.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: 'Invalid ticket selections.' }, { status: 400 });
  }

  const response = await fetchTicketEvidence(input.data);
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
}
