import { createClientRequestId, ensureAnonSessionId } from '@/src/core/identifiers/session';
import { extractLegs } from '@/src/core/slips/extract';
import { getRunContext } from '@/src/core/context/getRunContext';

import { enrichInjuries } from '@/src/core/providers/injuriesProvider';
import { enrichOdds } from '@/src/core/providers/oddsProvider';
import { enrichStats } from '@/src/core/providers/statsProvider';
import { runStore } from '@/src/core/run/store';
import type { EnrichedLeg, ExtractedLeg, ProviderMode, Run, SourceStats, VerdictAnalysis } from '@/src/core/run/types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));


const normalizeSlipText = (rawSlipText: string): string => {
  return rawSlipText
    .replace(/\r/g, '\n')
    .replace(/[•●◦▪▸►]/g, '\n')
    .replace(/\t+/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
};

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

export function computeLegRisk(leg: EnrichedLeg): { riskScore: number; riskBand: 'low' | 'moderate' | 'high'; factors: string[] } {
  const factors: string[] = [];
  let riskScore = 0;

  if (leg.l10 < 60) {
    riskScore += (60 - leg.l10) * 0.8;
    factors.push(`L10 downside ${100 - leg.l10}%`);
  }

  if (leg.l5 < 58) {
    riskScore += (58 - leg.l5) * 1.1;
    factors.push(`L5 downside ${100 - leg.l5}%`);
  }

  if (leg.flags.injury) {
    riskScore += 16;
    factors.push('Injury watch');
  }

  if (leg.flags.news) {
    riskScore += 8;
    factors.push('News volatility');
  }

  if (typeof leg.flags.lineMove === 'number' && Math.abs(leg.flags.lineMove) >= 1) {
    riskScore += 10;
    factors.push(`Line moved ${leg.flags.lineMove}`);
  }

  if (typeof leg.flags.divergence === 'number' && leg.flags.divergence >= 0.5) {
    riskScore += 7;
    factors.push(`Books disagree (${leg.flags.divergence})`);
  }

  const normalized = Number(riskScore.toFixed(2));
  const riskBand: 'low' | 'moderate' | 'high' = normalized >= 24 ? 'high' : normalized >= 10 ? 'moderate' : 'low';

  return {
    riskScore: normalized,
    riskBand,
    factors: factors.length > 0 ? factors : ['No downside drivers flagged.']
  };
}

function computeConfidenceCap(enrichedLegs: EnrichedLeg[], sources: SourceStats, trustedInjuriesCoverage: 'live' | 'fallback' | 'none' = 'fallback', hasUnverifiedInjurySignal = false): number {
  if (trustedInjuriesCoverage === 'none') return hasUnverifiedInjurySignal ? 72 : 75;
  const fallbackHeavyLegs = enrichedLegs.filter((leg) => {
    const ds = leg.dataSources;
    if (!ds) return true;
    return ds.stats === 'fallback' && ds.injuries === 'fallback' && ds.odds === 'fallback';
  }).length;

  if (sources.injuries === 'fallback' && sources.odds === 'fallback' && sources.stats === 'fallback' && fallbackHeavyLegs > enrichedLegs.length / 2) return 65;
  if (sources.stats === 'live' && sources.injuries === 'fallback' && sources.odds === 'fallback' && enrichedLegs.every((leg) => leg.dataSources?.stats === 'live')) return 75;
  if (sources.stats === 'live' && sources.injuries === 'live' && sources.odds === 'live') return 85;
  return 80;
}

function buildReasonPrefix(position: number): string {
  if (position === 0) return 'Highest downside';
  if (position === 1) return 'Next highest downside';
  return `Downside #${position + 1}`;
}

export function computeVerdict(enrichedLegs: EnrichedLeg[], extractedLegs: ExtractedLeg[], sources: SourceStats, trustedInjuriesCoverage: 'live' | 'fallback' | 'none' = 'fallback', unverifiedItems: Array<{ kind: string; headline: string }> = []): VerdictAnalysis {
  if (enrichedLegs.length === 0) {
    return {
      confidencePct: 35,
      weakestLegId: null,
      reasons: ['No legs found. Paste one leg per line to generate analysis.'],
      riskLabel: 'Weak',
      computedAt: new Date().toISOString()
    };
  }

  const scored = enrichedLegs.map((leg) => {
    const risk = computeLegRisk(leg);
    return {
      leg,
      riskScore: risk.riskScore,
      riskBand: risk.riskBand,
      factors: risk.factors
    };
  }).sort((a, b) => b.riskScore - a.riskScore);

  const weakestLegId = scored[0]?.leg.extractedLegId ?? null;
  const avgRisk = scored.reduce((sum, item) => sum + item.riskScore, 0) / scored.length;
  const baseConfidence = clamp(Math.round(100 - avgRisk * 0.9), 35, 85);
  const unverifiedInjurySignals = unverifiedItems.filter((item) => item.kind === 'injury' || item.kind === 'suspension' || item.kind === 'status');
  const hasUnverifiedInjurySignal = trustedInjuriesCoverage === 'none' && unverifiedInjurySignals.length >= 2;
  const confidenceCap = computeConfidenceCap(enrichedLegs, sources, trustedInjuriesCoverage, hasUnverifiedInjurySignal);
  const confidencePct = Math.min(baseConfidence, confidenceCap);

  const reasons = scored.slice(0, 3).map((entry, index) => {
    const extracted = extractedLegs.find((item) => item.id === entry.leg.extractedLegId);
    const description = entry.riskScore === 0
      ? 'No downside drivers flagged from recent form.'
      : `${entry.factors.join(', ')}; risk ${entry.riskScore.toFixed(1)}`;
    return `${buildReasonPrefix(index)}: ${extracted?.selection ?? entry.leg.extractedLegId} — ${description}.`;
  });

  if (process.env.NODE_ENV !== 'production') {
    if (weakestLegId !== scored[0]?.leg.extractedLegId) {
      throw new Error('computeVerdict invariant failed: weakestLegId mismatch');
    }

    const validLegIds = new Set(extractedLegs.map((leg) => leg.id));
    for (const reason of reasons) {
      const hasReferencedLeg = extractedLegs.some((leg) => reason.includes(leg.selection) || reason.includes(leg.id));
      if (!hasReferencedLeg) throw new Error('computeVerdict invariant failed: reason missing leg reference');
    }

    scored.forEach((entry) => {
      if (entry.riskScore === 0) {
        const text = reasons.find((reason) => reason.includes(entry.leg.extractedLegId) || reason.includes(extractedLegs.find((leg) => leg.id === entry.leg.extractedLegId)?.selection ?? ''));
        if (text && /downside drivers|risk\s+0\.0/i.test(text) === false && /No downside drivers flagged/.test(text) === false) {
          throw new Error('computeVerdict invariant failed: zero-risk leg described as downside driver');
        }
      }
      if (!validLegIds.has(entry.leg.extractedLegId)) throw new Error('computeVerdict invariant failed: leg id missing from extracted legs');
    });
  }

  const riskLabel: VerdictAnalysis['riskLabel'] = confidencePct >= 70 ? 'Strong' : confidencePct >= 55 ? 'Caution' : 'Weak';

  return {
    confidencePct,
    weakestLegId,
    reasons: [
      ...reasons,
      `Average per-leg risk is ${avgRisk.toFixed(1)} across ${enrichedLegs.length} legs.`,
      confidencePct >= 70 ? 'Current build grades as playable if prices hold.' : 'Consider trimming weak legs before placing the slip.'
    ].slice(0, 6),
    riskLabel,
    computedAt: new Date().toISOString(),
    dataQuality: {
      trustedCoverage: trustedInjuriesCoverage,
      hasUnverified: unverifiedItems.length > 0,
      confidenceCapReason: trustedInjuriesCoverage === 'none'
        ? (hasUnverifiedInjurySignal ? 'Trusted injuries unavailable; unverified injury/status context can only reduce confidence.' : 'Trusted injuries unavailable; confidence capped until verified updates arrive.')
        : undefined
    }
  };
}

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

export async function runSlip(slipText: string, options?: { coverageAgentEnabled?: boolean }): Promise<string> {
  const normalizedSlipText = normalizeSlipText(slipText);
  const traceId = createClientRequestId();
  const now = new Date().toISOString();
  const initial: Run = {
    traceId,
    createdAt: now,
    updatedAt: now,
    status: 'running',
    slipText: normalizedSlipText,
    metadata: { originalSlipText: slipText },
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

  const apiLegs = await extractWithApi(normalizedSlipText);
  const extracted = normalizeLegs(apiLegs.length > 0 ? apiLegs : extractLegs(normalizedSlipText));
  const sportRaw = extracted.find((leg) => leg.sport)?.sport?.toLowerCase();
  const inferredSport = !sportRaw;
  const sport: 'nba' | 'nfl' | 'soccer' = sportRaw === 'nfl' || sportRaw === 'soccer' ? sportRaw : 'nba';

  const sources: SourceStats = { stats: 'fallback', injuries: 'fallback', odds: 'fallback' };
  const trustedContext = await getRunContext({
    sport,
    teams: extracted.flatMap((leg) => leg.team ? [{ team: leg.team }] : []),
    players: extracted.flatMap((leg) => leg.player ? [{ player: leg.player, team: leg.team }] : []),
    eventIds: extracted.flatMap((leg) => leg.id ? [leg.id] : []),
    legsText: normalizedSlipText,
    coverageAgentEnabled: options?.coverageAgentEnabled
  });

  const enrichedLegs: EnrichedLeg[] = [];
  for (const leg of extracted) {
    const [stats, injuries, odds] = await Promise.all([enrichStats(leg), enrichInjuries(leg), enrichOdds(leg)]);
    if (stats.source === 'live') sources.stats = 'live';
    if (injuries.source === 'live') sources.injuries = 'live';
    if (odds.source === 'live') sources.odds = 'live';

    const dataSources: { stats: ProviderMode; injuries: ProviderMode; odds: ProviderMode } = {
      stats: stats.source,
      injuries: injuries.source,
      odds: odds.source
    };

    const seed: EnrichedLeg = {
      extractedLegId: leg.id,
      l5: stats.l5,
      l10: stats.l10,
      season: stats.season,
      vsOpp: stats.vsOpp,
      dataSources,
      flags: {
        injury: injuries.injury,
        news: injuries.news,
        lineMove: odds.lineMove,
        divergence: odds.divergence
      },
      evidenceNotes: [...stats.notes, ...injuries.notes, ...odds.notes]
    };

    const risk = computeLegRisk(seed);
    enrichedLegs.push({
      ...seed,
      riskScore: risk.riskScore,
      riskBand: risk.riskBand,
      riskFactors: risk.factors
    });
  }

  const analysis = computeVerdict(enrichedLegs, extracted, sources, trustedContext.coverage.injuries, trustedContext.unverifiedItems ?? []);

  await runStore.updateRun(traceId, {
    status: 'complete',
    extractedLegs: extracted,
    enrichedLegs,
    analysis,
    sources,
    trustedContext,
    metadata: {
      ...initial.metadata,
      inferredSport
    },
    updatedAt: new Date().toISOString()
  });

  return traceId;
}
