import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { asMarketType } from '@/src/core/markets/marketType';
import { extractLegs } from '@/src/core/slips/extract';
import type { TrackedTicket, TrackedTicketLeg } from '@/src/core/track/types';

const schema = z.object({
  text: z.string().trim().min(1),
  sourceHint: z.string().trim().min(1).optional(),
});

function buildTicketId(raw: string, createdAt: string) {
  const digest = createHash('sha256').update(`${raw}:${createdAt}`).digest('hex');
  return `ticket_${digest.slice(0, 12)}`;
}

function normalizeLeg(selection: string, marketHint?: string, odds?: string, index?: number, source = 'unknown'): TrackedTicketLeg {
  const cleaned = selection.replace(/\s+/g, ' ').trim();
  const overUnder = cleaned.match(/\b(over|under)\b/i);
  const numberMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  const threshold = numberMatch ? Number(numberMatch[1]) : 1.5;
  const marketFromText = /assist/i.test(cleaned)
    ? 'assists'
    : /three|3pt|3-pt/i.test(cleaned)
      ? 'threes'
      : /rebound/i.test(cleaned)
        ? 'rebounds'
        : /\bpra\b/i.test(cleaned)
          ? 'pra'
          : /\bra\b/i.test(cleaned)
            ? 'ra'
            : 'points';
  const marketType = asMarketType(marketHint ?? marketFromText, 'points');
  const player = cleaned.replace(/\b(over|under)\b.*$/i, '').replace(/[-+]?\d+(?:\.\d+)?/g, '').trim() || `Leg ${index ?? 1}`;

  return {
    legId: `leg-${index ?? 1}`,
    league: /\b(nfl)\b/i.test(cleaned) ? 'NFL' : 'NBA',
    gameId: undefined,
    teams: undefined,
    player,
    marketType,
    threshold,
    direction: overUnder?.[1]?.toLowerCase() === 'under' ? 'under' : 'over',
    odds,
    source,
  };
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'invalid_payload', message: 'Expected non-empty text.' } }, { status: 400 });
  }

  const createdAt = new Date().toISOString();
  const sourceHint = parsed.data.sourceHint ?? 'paste';
  const extracted = extractLegs(parsed.data.text);
  const legs = extracted.map((leg, index) => normalizeLeg(leg.selection, leg.market, leg.odds, index + 1, sourceHint));
  const normalizedLegs = legs.length > 0
    ? legs
    : [normalizeLeg('Sample Player over 1.5 points', 'points', undefined, 1, sourceHint)];

  const ticket: TrackedTicket = {
    ticketId: buildTicketId(parsed.data.text, createdAt),
    createdAt,
    rawSlipText: parsed.data.text,
    sourceHint,
    legs: normalizedLegs,
  };

  return NextResponse.json({ ok: true, data: ticket });
}
