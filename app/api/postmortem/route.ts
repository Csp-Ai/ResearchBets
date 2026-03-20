import { NextResponse } from 'next/server';

import { attachAttributionToReport } from '@/src/core/contracts/slipStructureReport';
import type { SlipStructureReport } from '@/src/core/contracts/slipStructureReport';
import { getBettorMemorySnapshot, getSlipForPostmortem } from '@/src/core/bettor-memory/service.server';
import { computePostmortemAttribution, type PostmortemLegInput } from '@/src/core/postmortem/attribution';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

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
  let legs = Array.isArray(body.legs) ? body.legs : [];
  let sourceQuality: 'verified' | 'partial' | 'demo' = body.mode === 'demo' ? 'demo' : 'partial';
  let storedCoverage: Awaited<ReturnType<typeof getBettorMemorySnapshot>>['coverage'] | null = null;

  if (body.slip_id) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const snapshot = await getBettorMemorySnapshot(data.user.id);
        storedCoverage = snapshot.coverage;
        const storedSlip = await getSlipForPostmortem(data.user.id, body.slip_id);
        if (storedSlip && (storedSlip.verification_status === 'verified' || legs.length === 0)) {
          legs = storedSlip.legs.map((leg) => ({
            id: leg.leg_id,
            selection: leg.player_name ?? leg.team_name ?? leg.market_type ?? 'Unknown leg',
            market: leg.normalized_market_label ?? leg.market_type ?? undefined,
            line: leg.line != null ? String(leg.line) : undefined,
            odds: leg.odds != null ? String(leg.odds) : undefined,
            team: leg.team_name ?? undefined,
            player: leg.player_name ?? undefined,
            game: leg.event_descriptor ?? undefined,
            riskFlags: [storedSlip.verification_status === 'verified' ? 'verified history' : 'review needed'],
          }));
          sourceQuality = storedSlip.verification_status === 'verified' ? 'verified' : storedSlip.data_source === 'demo_parse' ? 'demo' : 'partial';
        }
      }
    } catch {
      storedCoverage = null;
    }
  }

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
    game: leg.game,
  })), {
    trace_id: body.trace_id,
    slip_id: body.slip_id,
    mode: body.mode ?? (sourceQuality === 'demo' ? 'demo' : 'live'),
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

  const sourceQualityLabel = sourceQuality === 'verified'
    ? 'Mostly verified'
    : sourceQuality === 'demo'
      ? 'Demo/fallback heavy'
      : storedCoverage?.labels.postmortem.label ?? 'Mixed coverage';
  const sourceQualityDetail = sourceQuality === 'verified'
    ? 'Post-mortem signals are based mostly on verified settled slips.'
    : sourceQuality === 'demo'
      ? 'Post-mortem signals are limited by demo/fallback inputs.'
      : storedCoverage?.postmortemSourceQuality.detail ?? 'Post-mortem signals are limited by partial review coverage.';

  return NextResponse.json({
    ok: true,
    trace_id: body.trace_id,
    slip_id: body.slip_id,
    attribution,
    report: attachAttributionToReport(report, attribution ?? undefined),
    classification,
    correlationScore: report.correlation_edges.length,
    volatilityTier: report.risk_band === 'high' ? 'High' : report.risk_band === 'med' ? 'Med' : 'Low',
    advisoryStrength: sourceQuality === 'verified' ? 'strong' : sourceQuality === 'partial' ? 'guarded' : 'tentative',
    sourceQuality,
    credibility: {
      label: sourceQualityLabel,
      detail: sourceQualityDetail,
      verifiedSettledSlips: storedCoverage?.settledSlips.verified.count ?? (sourceQuality === 'verified' ? 1 : 0),
      unverifiedSettledSlips: storedCoverage ? storedCoverage.settledSlips.total - storedCoverage.settledSlips.verified.count : sourceQuality === 'verified' ? 0 : legs.length > 0 ? 1 : 0,
      demoSettledSlips: storedCoverage?.settledSlips.demoFallback.count ?? (sourceQuality === 'demo' ? 1 : 0),
      verifiedCoveragePct: storedCoverage?.settledSlips.verified.percent ?? (sourceQuality === 'verified' ? 100 : 0),
      bucket: storedCoverage?.labels.postmortem.bucket ?? (sourceQuality === 'verified' ? 'mostly_verified' : sourceQuality === 'demo' ? 'demo_fallback_heavy' : 'mixed_coverage'),
      partialCoverage: storedCoverage?.settledSlips.partialCoverage ?? (body.parse_status === 'partial'),
    },
    exposureSummary: {
      topGames: report.script_clusters.map((cluster) => ({ game: cluster.label, count: cluster.leg_ids.length })),
      topPlayers: []
    },
    notes: [
      sourceQuality === 'verified' ? 'Post-mortem uses bettor-verified slip data.' : sourceQuality === 'demo' ? 'Post-mortem uses demo parser scaffolding; conclusions are tentative until review.' : 'Post-mortem uses unverified parsed data; review fields before trusting the explanation.',
      classification.correlationMiss ? 'Multiple legs depend on shared game script; correlation likely amplified variance.' : 'No major correlation concentration detected.',
      classification.injuryImpact ? 'Rotation or injury context likely changed usage.' : 'No explicit injury or rotation shock detected in provided legs.',
      classification.lineValueMiss ? 'Entry price or threshold looked aggressive for the tracked pace.' : 'No obvious line value miss in deterministic check.'
    ]
  });
}
