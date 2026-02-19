import { createClientRequestId, ensureAnonSessionId } from '@/src/core/identifiers/session';
import { extractLegs } from '@/src/core/slips/extract';

import { enrichInjuries } from '@/src/core/providers/injuriesProvider';
import { enrichOdds } from '@/src/core/providers/oddsProvider';
import { enrichStats } from '@/src/core/providers/statsProvider';
import { runStore } from '@/src/core/run/store';
import type { EnrichedLeg, ExtractedLeg, Run, SourceStats, VerdictAnalysis } from '@/src/core/run/types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const parseLine = (selection: string): number | undefined => {
  const match = selection.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return undefined;
  return Number(match[1]);
};

const normalizeLegs = (rawLegs: Array<{ selection: string; market?: string; line?: string; odds?: string; team?: string; player?: string; sport?: string; eventTime?: string; book?: string }>): ExtractedLeg[] => {
  return rawLegs.map((leg, index) => ({
    id: `leg-${index}-${leg.selection.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    selection: leg.selection,
    market: leg.market,
    line: leg.line ?? (parseLine(leg.selection)?.toString()),
    odds: leg.odds,
    team: leg.team,
    player: leg.player,
    sport: leg.sport ?? 'NBA',
    eventTime: leg.eventTime,
    book: leg.book
  }));
};

const perLegRisk = (leg: EnrichedLeg): number => {
  let risk = 0;
  risk += Math.max(0, 60 - leg.l10) * 0.8;
  risk += Math.max(0, 58 - leg.l5) * 1.1;
  if (leg.flags.injury) risk += 16;
  if (leg.flags.news) risk += 8;
  if (typeof leg.flags.lineMove === 'number' && Math.abs(leg.flags.lineMove) >= 1) risk += 10;
  if (typeof leg.flags.divergence === 'number' && leg.flags.divergence >= 0.5) risk += 7;
  return Number(risk.toFixed(2));
};

const buildAnalysis = (enrichedLegs: EnrichedLeg[], extractedLegs: ExtractedLeg[]): VerdictAnalysis => {
  if (enrichedLegs.length === 0) {
    return {
      confidencePct: 35,
      weakestLegId: null,
      reasons: ['No legs found. Paste one leg per line to generate analysis.'],
      riskLabel: 'Weak',
      computedAt: new Date().toISOString()
    };
  }

  const scored = enrichedLegs.map((leg) => ({ leg, risk: perLegRisk(leg) }));
  scored.sort((a, b) => b.risk - a.risk);
  const weakest = scored[0];
  const avgRisk = scored.reduce((sum, item) => sum + item.risk, 0) / scored.length;
  const confidencePct = clamp(Math.round(100 - avgRisk * 0.9), 35, 85);

  const topReasons = scored
    .slice(0, 3)
    .map(({ leg, risk }) => {
      const extracted = extractedLegs.find((item) => item.id === leg.extractedLegId);
      const detail = [`${leg.l5}% L5`, `${leg.l10}% L10`];
      if (leg.flags.divergence) detail.push(`book divergence ${leg.flags.divergence}`);
      if (leg.flags.injury) detail.push('injury flag');
      if (leg.flags.lineMove) detail.push(`line move ${leg.flags.lineMove}`);
      return `${extracted?.selection ?? leg.extractedLegId} carries most downside (${detail.join(', ')}; risk ${risk.toFixed(1)}).`;
    });

  const reasons = [
    ...topReasons,
    `Average per-leg risk is ${avgRisk.toFixed(1)} across ${enrichedLegs.length} legs.`,
    confidencePct >= 70 ? 'Current build grades as playable if prices hold.' : 'Consider trimming weak legs before placing the slip.'
  ].slice(0, 6);

  const riskLabel: VerdictAnalysis['riskLabel'] = confidencePct >= 70 ? 'Strong' : confidencePct >= 55 ? 'Caution' : 'Weak';

  return {
    confidencePct,
    weakestLegId: weakest?.leg.extractedLegId ?? null,
    reasons,
    riskLabel,
    computedAt: new Date().toISOString()
  };
};

async function extractWithApi(slipText: string): Promise<Array<{ selection: string; market?: string; line?: string; odds?: string }>> {
  try {
    const anonSessionId = ensureAnonSessionId();
    const submitRes = await fetch('/api/slips/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'paste', raw_text: slipText, anon_session_id: anonSessionId, request_id: createClientRequestId() })
    }).then((res) => res.json());

    const extractRes = await fetch('/api/slips/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slip_id: submitRes.slip_id, request_id: createClientRequestId(), anon_session_id: anonSessionId })
    }).then((res) => res.json());

    return Array.isArray(extractRes.extracted_legs) ? extractRes.extracted_legs : [];
  } catch {
    return [];
  }
}

export async function runSlip(slipText: string): Promise<string> {
  const traceId = createClientRequestId();
  const now = new Date().toISOString();
  const initial: Run = {
    traceId,
    createdAt: now,
    updatedAt: now,
    status: 'running',
    slipText,
    extractedLegs: [],
    enrichedLegs: [],
    analysis: {
      confidencePct: 35,
      weakestLegId: null,
      reasons: ['Run started.'],
      riskLabel: 'Weak',
      computedAt: now
    },
    sources: { stats: 'fallback', injuries: 'fallback', odds: 'fallback' }
  };

  await runStore.saveRun(initial);

  const apiLegs = await extractWithApi(slipText);
  const extracted = normalizeLegs(apiLegs.length > 0 ? apiLegs : extractLegs(slipText));

  const sources: SourceStats = { stats: 'fallback', injuries: 'fallback', odds: 'fallback' };

  const enrichedLegs: EnrichedLeg[] = [];
  for (const leg of extracted) {
    const [stats, injuries, odds] = await Promise.all([enrichStats(leg), enrichInjuries(leg), enrichOdds(leg)]);
    if (stats.source === 'live') sources.stats = 'live';
    if (injuries.source === 'live') sources.injuries = 'live';
    if (odds.source === 'live') sources.odds = 'live';

    enrichedLegs.push({
      extractedLegId: leg.id,
      l5: stats.l5,
      l10: stats.l10,
      season: stats.season,
      vsOpp: stats.vsOpp,
      flags: {
        injury: injuries.injury,
        news: injuries.news,
        lineMove: odds.lineMove,
        divergence: odds.divergence
      },
      evidenceNotes: [...stats.notes, ...injuries.notes, ...odds.notes]
    });
  }

  const analysis = buildAnalysis(enrichedLegs, extracted);

  await runStore.updateRun(traceId, {
    status: 'complete',
    extractedLegs: extracted,
    enrichedLegs,
    analysis,
    sources,
    updatedAt: new Date().toISOString()
  });

  return traceId;
}
