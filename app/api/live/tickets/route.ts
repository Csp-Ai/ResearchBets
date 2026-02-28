import { NextResponse } from 'next/server';
import { z } from 'zod';

import { asMarketType } from '@/src/core/markets/marketType';
import type { TrackedTicket } from '@/src/core/track/types';

const schema = z.object({
  tickets: z.array(z.object({
    ticketId: z.string().min(1),
    createdAt: z.string().min(1),
    sourceHint: z.string().min(1),
    rawSlipText: z.string(),
    legs: z.array(z.object({
      legId: z.string().min(1),
      marketType: z.string().min(1),
      threshold: z.number(),
      player: z.string().min(1),
      gameId: z.string().optional()
    }))
  }))
});

function hashToUnit(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function buildDeterministicUpdates(tickets: TrackedTicket[]) {
  const updates: Record<string, { currentValue: number; liveMargin: number; elapsedGameMinutes: number; quarter: 1 | 2 | 3 | 4 }> = {};

  for (const ticket of tickets) {
    for (const leg of ticket.legs) {
      const seed = hashToUnit(`${ticket.ticketId}:${leg.legId}:${Math.floor(Date.now() / 15000)}`);
      const elapsedGameMinutes = Number((8 + (seed * 28)).toFixed(1));
      const quarter = Math.min(4, Math.max(1, Math.floor(elapsedGameMinutes / 12) + 1)) as 1 | 2 | 3 | 4;
      const pace = asMarketType(leg.marketType, 'points') === 'assists' ? 0.66 : 0.9;
      updates[leg.legId] = {
        currentValue: Number((leg.threshold * (0.16 + (seed * pace))).toFixed(1)),
        liveMargin: Math.round(4 + (seed * 20)),
        elapsedGameMinutes,
        quarter,
      };
    }
  }

  return updates;
}

function buildCoverage(tickets: TrackedTicket[]) {
  const coverage: Record<string, { coverage: 'full' | 'partial' | 'none'; legs: Record<string, { coverage: 'covered' | 'missing'; reason?: 'no_game_id' | 'provider_unavailable' | 'unsupported_market' }> }> = {};

  for (const ticket of tickets) {
    const legs: Record<string, { coverage: 'covered' | 'missing'; reason?: 'no_game_id' | 'provider_unavailable' | 'unsupported_market' }> = {};
    for (const leg of ticket.legs) {
      if (!leg.gameId) {
        legs[leg.legId] = { coverage: 'missing', reason: 'no_game_id' };
        continue;
      }
      if (leg.marketType === 'moneyline') {
        legs[leg.legId] = { coverage: 'missing', reason: 'unsupported_market' };
        continue;
      }
      const unstable = hashToUnit(`${ticket.ticketId}:${leg.legId}:coverage`) < 0.05;
      legs[leg.legId] = unstable ? { coverage: 'missing', reason: 'provider_unavailable' } : { coverage: 'covered' };
    }
    const covered = Object.values(legs).filter((item) => item.coverage === 'covered').length;
    const total = Object.keys(legs).length;
    coverage[ticket.ticketId] = { coverage: covered === 0 ? 'none' : covered === total ? 'full' : 'partial', legs };
  }

  return coverage;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'invalid_payload', message: 'Invalid tickets payload.' } }, { status: 400 });
  }

  const mode = process.env.LIVE_MODE === '1' ? 'live' : 'demo';
  const tickets = parsed.data.tickets as TrackedTicket[];
  return NextResponse.json({
    ok: true,
    data: { updates: buildDeterministicUpdates(tickets), coverage: buildCoverage(tickets) },
    provenance: {
      mode,
      reason: mode === 'demo' ? 'Demo mode (live feeds off)' : undefined,
      generatedAt: new Date().toISOString(),
    }
  });
}
