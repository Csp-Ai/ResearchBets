import type { ResearchReport } from '@/src/core/evidence/evidenceSchema';

import type { Run } from './types';

export type ResearchProvenance = {
  source: 'LIVE' | 'CACHE' | 'DEMO' | 'UNKNOWN';
  degraded?: boolean;
  degraded_reason?: string;
};

export type ResearchRunDTO = {
  run_id: string;
  slip_id?: string;
  trace_id?: string;
  snapshot_id?: string;
  anon_session_id?: string;
  request_id?: string;
  raw_slip_text: string;
  legs: Array<{
    id: string;
    selection: string;
    market?: string;
    line?: string;
    odds?: string;
    team?: string;
    player?: string;
    sport?: string;
    evidenceStrength: number;
    volatility: 'low' | 'moderate' | 'high';
    notes: string[];
    riskFlags: string[];
    provenance: ResearchProvenance;
  }>;
  verdict: {
    decision: 'KEEP' | 'MODIFY' | 'PASS';
    confidence: number;
    risk: 'LOW' | 'MED' | 'HIGH';
    weakest_leg_id?: string;
    reasons: string[];
  };
  provenance: ResearchProvenance;
  snapshotHighlights?: Array<{
    title: string;
    bullets: string[];
    severity?: 'info' | 'warn' | 'danger';
    source?: string;
  }>;
};

const toProvenance = (source: 'live' | 'fallback' | undefined): ResearchProvenance => {
  if (source === 'live') return { source: 'LIVE' };
  if (source === 'fallback') return { source: 'CACHE', degraded: true, degraded_reason: 'Fallback provider data used.' };
  return { source: 'UNKNOWN' };
};

export function toResearchRunDTOFromRun(run: Run): ResearchRunDTO {
  const confidence = run.analysis.confidencePct;
  return {
    run_id: run.traceId,
    slip_id: run.slipId,
    trace_id: run.traceId,
    snapshot_id: run.snapshotId,
    anon_session_id: run.anonSessionId,
    request_id: run.requestId,
    raw_slip_text: run.slipText,
    legs: run.extractedLegs.map((leg) => {
      const enriched = run.enrichedLegs.find((entry) => entry.extractedLegId === leg.id);
      return {
        id: leg.id,
        selection: leg.selection,
        market: leg.market,
        line: leg.line,
        odds: leg.odds,
        team: leg.team,
        player: leg.player,
        sport: leg.sport,
        evidenceStrength: enriched?.l10 ?? 0,
        volatility: enriched?.riskBand ?? 'moderate',
        notes: enriched?.evidenceNotes ?? [],
        riskFlags: enriched?.riskFactors ?? [],
        provenance: toProvenance(enriched?.dataSources?.stats)
      };
    }),
    verdict: {
      decision: confidence >= 70 ? 'KEEP' : confidence >= 55 ? 'MODIFY' : 'PASS',
      confidence,
      risk: confidence >= 70 ? 'LOW' : confidence >= 55 ? 'MED' : 'HIGH',
      weakest_leg_id: run.analysis.weakestLegId ?? undefined,
      reasons: run.analysis.reasons
    },
    provenance: toProvenance(run.sources.stats === 'live' || run.sources.injuries === 'live' || run.sources.odds === 'live' ? 'live' : 'fallback')
  };
}

export function mergeSnapshotHighlights(dto: ResearchRunDTO, snapshot: ResearchReport): ResearchRunDTO {
  const cards = [
    snapshot.summary ? { title: 'Summary', bullets: [snapshot.summary], severity: 'info' as const, source: 'research_snapshot' } : null,
    snapshot.claims.length > 0
      ? {
        title: 'Top claims',
        bullets: snapshot.claims.slice(0, 3).map((claim) => claim.text),
        severity: 'warn' as const,
        source: 'research_snapshot'
      }
      : null,
    snapshot.risks.length > 0
      ? {
        title: 'Risks to monitor',
        bullets: snapshot.risks.slice(0, 3),
        severity: 'danger' as const,
        source: 'research_snapshot'
      }
      : null
  ].filter((card): card is NonNullable<typeof card> => Boolean(card)).slice(0, 2);

  return {
    ...dto,
    snapshot_id: dto.snapshot_id ?? snapshot.reportId,
    snapshotHighlights: cards
  };
}

export function validateResearchRunDTO(dto: ResearchRunDTO): boolean {
  if (!dto.run_id || !dto.raw_slip_text) return false;
  if (!Array.isArray(dto.legs) || dto.legs.length === 0) return false;
  if (!Array.isArray(dto.verdict.reasons)) return false;
  if (dto.verdict.confidence < 0 || dto.verdict.confidence > 100) return false;
  return true;
}
