import { NextResponse } from 'next/server';

import type { Attribution } from '@/src/core/contracts/slipStructureReport';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';

const includesAny = (value: string, terms: string[]) => terms.some((term) => value.toLowerCase().includes(term));

const buildAttribution = (
  joined: string,
  outcome: 'win' | 'loss' | 'push' | 'partial',
  weakestLegId?: string
): Attribution => {
  const tags: string[] = [];
  if (includesAny(joined, ['same game', 'assist', 'points'])) tags.push('correlation_miss');
  if (includesAny(joined, ['injury', 'questionable', 'out'])) tags.push('injury');
  if (includesAny(joined, ['line moved', 'steam', 'drift'])) tags.push('line_value_miss');
  if (tags.length === 0) tags.push('variance');

  const narrative = outcome === 'loss'
    ? 'Loss profile indicates structural fragility. Attribution tags highlight the most likely process misses.'
    : 'Outcome did not show a clear structural failure. Attribution remains informational for review.';

  return {
    outcome,
    breaker_leg_id: weakestLegId,
    tags,
    narrative
  };
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { trace_id?: string; slip_id?: string; mode?: 'live' | 'cache' | 'demo'; legs?: Array<{ id?: string; selection?: string; riskFlags?: string[]; market?: string; line?: string; odds?: string; team?: string; player?: string; game?: string }>; outcome?: 'win' | 'loss' | 'push' };
  const legs = Array.isArray(body.legs) ? body.legs : [];
  const outcome = body.outcome ?? 'loss';

  const joined = legs.map((leg) => `${leg.selection ?? ''} ${(leg.riskFlags ?? []).join(' ')}`).join(' | ');
  const report = buildSlipStructureReport(legs.map((leg, index) => ({
    id: leg.id ?? `pm-${index}`,
    selection: leg.selection,
    market: leg.market,
    line: leg.line,
    odds: leg.odds,
    team: leg.team,
    player: leg.player,
    game: leg.game
  })), {
    trace_id: body.trace_id,
    slip_id: body.slip_id,
    mode: body.mode ?? 'demo'
  });

  const classification = {
    process: outcome === 'loss' && legs.length >= 2 ? 'Good process / bad variance' : 'Good process / expected outcome',
    correlationMiss: includesAny(joined, ['same game', 'assist', 'points']) && legs.length >= 3,
    injuryImpact: includesAny(joined, ['injury', 'questionable', 'out']),
    lineValueMiss: outcome === 'loss' && includesAny(joined, ['line moved', 'steam', 'drift'])
  };

  const attribution = buildAttribution(joined, outcome, report.weakest_leg_id);

  return NextResponse.json({
    ok: true,
    trace_id: body.trace_id,
    slip_id: body.slip_id,
    attribution,
    report: {
      ...report,
      attribution
    },
    classification,
    correlationScore: report.correlation_edges.length,
    volatilityTier: report.risk_band === 'high' ? 'High' : report.risk_band === 'med' ? 'Med' : 'Low',
    exposureSummary: {
      topGames: report.script_clusters.map((cluster) => ({ game: cluster.label, count: cluster.leg_ids.length })),
      topPlayers: []
    },
    notes: [
      classification.correlationMiss ? 'Multiple legs depend on shared game script; correlation likely amplified variance.' : 'No major correlation concentration detected.',
      classification.injuryImpact ? 'Injury context likely changed rotation or usage.' : 'No explicit injury shock detected in provided legs.',
      classification.lineValueMiss ? 'Late line movement suggests weaker entry price.' : 'No obvious line value miss in deterministic check.'
    ]
  });
}
