import { NextResponse } from 'next/server';
import { z } from 'zod';

import { CANONICAL_KEYS } from '@/src/core/env/keys';
import { readString } from '@/src/core/env/read.server';
import { fetchSportsDataNflLiveProgress } from '@/src/core/live/sportsDataNflLive.server';
import { asMarketType } from '@/src/core/markets/marketType';
import type { TrackedTicket } from '@/src/core/track/types';

const legSchema = z.object({
  legId: z.string().min(1),
  league: z.string().default('NFL'),
  gameId: z.string().optional(),
  teams: z.string().optional(),
  player: z.string().min(1),
  rawPlayer: z.string().optional(),
  marketType: z.string().min(1),
  marketLabel: z.string().optional(),
  threshold: z.number(),
  direction: z.enum(['over', 'under']).default('over'),
  odds: z.string().optional(),
  source: z.string().default('tracked'),
  parseConfidence: z.enum(['high', 'medium', 'low']).default('medium'),
  needsReview: z.boolean().optional(),
  rawText: z.string().optional(),
  ladder: z.boolean().optional(),
});

const ticketSchema = z.object({
  ticketId: z.string().min(1),
  createdAt: z.string().min(1),
  sourceHint: z.string().min(1),
  rawSlipText: z.string(),
  cashoutAvailable: z.boolean().optional(),
  cashoutValue: z.number().optional(),
  mode: z.enum(['demo', 'cache', 'live']).optional(),
  legs: z.array(legSchema),
});

const schema = z.object({
  tickets: z.array(ticketSchema),
  mode: z.enum(['demo', 'cache', 'live']).optional(),
});

function hashToUnit(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function buildDeterministicDemoUpdates(tickets: TrackedTicket[]) {
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

function buildDemoCoverage(tickets: TrackedTicket[]) {
  const coverage: Record<string, { coverage: 'full' | 'partial' | 'none'; legs: Record<string, { coverage: 'covered' | 'missing'; reason?: 'no_game_id' | 'provider_unavailable' | 'unsupported_market' }> }> = {};

  for (const ticket of tickets) {
    const legs: Record<string, { coverage: 'covered' | 'missing'; reason?: 'no_game_id' | 'provider_unavailable' | 'unsupported_market' }> = {};
    for (const leg of ticket.legs) {
      if (!leg.gameId && !leg.teams) {
        legs[leg.legId] = { coverage: 'missing', reason: 'no_game_id' };
        continue;
      }
      if (leg.marketType === 'moneyline') {
        legs[leg.legId] = { coverage: 'missing', reason: 'unsupported_market' };
        continue;
      }
      legs[leg.legId] = { coverage: 'covered' };
    }
    const covered = Object.values(legs).filter((item) => item.coverage === 'covered').length;
    const total = Object.keys(legs).length;
    coverage[ticket.ticketId] = {
      coverage: covered === 0 ? 'none' : covered === total ? 'full' : 'partial',
      legs,
    };
  }

  return coverage;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid_payload', message: 'Invalid tickets payload.' } },
      { status: 400 },
    );
  }

  const requestedMode = parsed.data.mode;
  const ticketRequestsLive = parsed.data.tickets.some((ticket) => ticket.mode === 'live');
  const liveRequested =
    requestedMode === 'live' ||
    ticketRequestsLive ||
    (!requestedMode && readString(CANONICAL_KEYS.LIVE_MODE) === '1');
  const tickets = parsed.data.tickets as TrackedTicket[];

  if (liveRequested) {
    const live = await fetchSportsDataNflLiveProgress(tickets);
    if (!live.available) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'live_ticket_provider_unavailable',
            message: 'Provider-backed NFL player progress is unavailable for this tracked structure.',
          },
          data: {
            updates: {},
            coverage: live.coverage,
          },
          provenance: {
            mode: 'live',
            source: 'sportsdataio',
            reason: live.warnings[0] ?? 'provider_backed_live_updates_unavailable',
            warnings: live.warnings,
            generatedAt: live.generatedAt,
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        updates: live.updates,
        coverage: live.coverage,
      },
      provenance: {
        mode: 'live',
        source: 'sportsdataio',
        reason: 'provider_backed_nfl_box_score',
        warnings: live.warnings,
        generatedAt: live.generatedAt,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      updates: buildDeterministicDemoUpdates(tickets),
      coverage: buildDemoCoverage(tickets),
    },
    provenance: {
      mode: 'demo',
      reason: 'Demo mode (deterministic live simulation)',
      generatedAt: new Date().toISOString(),
    },
  });
}
