import { NextResponse } from 'next/server';

import { attachAttributionToReport } from '@/src/core/contracts/slipStructureReport';
import type { SlipStructureReport } from '@/src/core/contracts/slipStructureReport';
import { computePostmortemAttribution, type PostmortemLegInput } from '@/src/core/postmortem/attribution';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';

const includesAny = (value: string, terms: string[]) => terms.some((term) => value.toLowerCase().includes(term));

type PostmortemRequestBody = {
  trace_id?: string;
  slip_id?: string;
  mode?: 'live' | 'cache' | 'demo';
  parse_status?: 'success' | 'partial' | 'failed';
  report?: SlipStructureReport;
  legs?: PostmortemLegInput[];
  outcome?: 'win' | 'loss' | 'push' | 'partial';
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as PostmortemRequestBody;
  const legs = Array.isArray(body.legs) ? body.legs : [];
  const outcome = body.outcome ?? 'loss';

  const joined = legs.map((leg) => `${leg.selection ?? ''} ${(leg.riskFlags ?? []).join(' ')}`).join(' | ');
  const report = body.report ?? buildSlipStructureReport(legs.map((leg, index) => ({
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
    injuryImpact: includesAny(joined, ['injury', 'questionable', 'out', 'rotation']),
    lineValueMiss: outcome === 'loss' && includesAny(joined, ['line moved', 'steam', 'drift', 'alt line'])
  };

  const attribution = computePostmortemAttribution({
    trace_id: body.trace_id,
    slip_id: body.slip_id,
    outcome,
    legs,
    report,
    parse_status: body.parse_status
  });

  return NextResponse.json({
    ok: true,
    trace_id: body.trace_id,
    slip_id: body.slip_id,
    attribution,
    report: attachAttributionToReport(report, attribution ?? undefined),
    classification,
    correlationScore: report.correlation_edges.length,
    volatilityTier: report.risk_band === 'high' ? 'High' : report.risk_band === 'med' ? 'Med' : 'Low',
    exposureSummary: {
      topGames: report.script_clusters.map((cluster) => ({ game: cluster.label, count: cluster.leg_ids.length })),
      topPlayers: []
    },
    notes: [
      classification.correlationMiss ? 'Multiple legs depend on shared game script; correlation likely amplified variance.' : 'No major correlation concentration detected.',
      classification.injuryImpact ? 'Rotation or injury context likely changed usage.' : 'No explicit injury or rotation shock detected in provided legs.',
      classification.lineValueMiss ? 'Entry price or threshold looked aggressive for the tracked pace.' : 'No obvious line value miss in deterministic check.'
    ]
  });
}
