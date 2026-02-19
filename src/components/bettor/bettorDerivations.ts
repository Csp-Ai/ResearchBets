import type { ControlPlaneEvent } from '../AgentNodeGraph';
import type { ExtractedLeg } from '../../core/slips/extract';
import { asRecord } from '../terminal/eventDerivations';

export type SlipLeg = ExtractedLeg & { id?: string; line?: string; team?: string; gameId?: string };

export type SlipVerdictModel = {
  rating: 'A' | 'B' | 'C' | 'D';
  confidence: number;
  confidenceLabel: 'High' | 'Medium' | 'Low';
  riskLevel: 'Low' | 'Medium' | 'High';
  strongestLeg: string | null;
  weakestLeg: string | null;
  reasons: string[];
  riskFlags: string[];
  hasSignals: boolean;
};

export type LegInsightRow = {
  legId: string;
  legLabel: string;
  lineOdds: string;
  trend: string;
  evidenceStrength: 'Low' | 'Medium' | 'High';
  volatility: 'Solid' | 'Risky' | 'High variance';
  note: string;
  score: number;
  relatedEvents: ControlPlaneEvent[];
};

function eventText(event: ControlPlaneEvent): string {
  const payload = asRecord(event.payload);
  return `${event.event_name} ${JSON.stringify(payload)}`.toLowerCase();
}

function confidenceFromEvent(event: ControlPlaneEvent): number | null {
  const payload = asRecord(event.payload);
  const value = payload.confidence;
  return typeof value === 'number' ? Math.max(0, Math.min(1, value)) : null;
}

function deriveReasons(events: ControlPlaneEvent[]): string[] {
  const reasons: string[] = [];
  for (const event of [...events].reverse()) {
    const payload = asRecord(event.payload);
    const rationale = typeof payload.rationale === 'string' ? payload.rationale : null;
    const assumptions = Array.isArray(payload.assumptions) ? payload.assumptions.map(String) : [];
    const sources = Array.isArray(payload.sources) ? payload.sources.map(String) : [];
    if (rationale) reasons.push(rationale);
    reasons.push(...assumptions);
    reasons.push(...sources.map((source) => `Source: ${source}`));
    if (reasons.length >= 6) break;
  }
  return Array.from(new Set(reasons.filter((item) => item.trim().length > 0))).slice(0, 3);
}

function deriveRiskFlags(events: ControlPlaneEvent[], legs: SlipLeg[]): string[] {
  const flags = new Set<string>();
  const injuryFound = events.some((event) => eventText(event).includes('injur'));
  if (injuryFound) flags.add('Injury uncertainty');

  const lowEvidence = events.length < 6 || !events.some((event) => {
    const payload = asRecord(event.payload);
    return Array.isArray(payload.sources) && payload.sources.length > 0;
  });
  if (lowEvidence) flags.add('Low evidence');

  const tokens = legs.map((leg) => leg.selection.toLowerCase().split(/\s+/).slice(0, 2).join(' '));
  if (new Set(tokens).size < tokens.length) flags.add('Correlation risk');

  const volatile = events.some((event) => {
    const text = eventText(event);
    return text.includes('volatile') || text.includes('variance') || text.includes('swing');
  });
  if (volatile) flags.add('Volatility spike');

  return [...flags];
}

export function deriveLegInsights(events: ControlPlaneEvent[], legs: SlipLeg[] = []): LegInsightRow[] {
  return legs.map((leg, index) => {
    const label = leg.selection;
    const legId = leg.id ?? `${label}-${index}`;
    const selectionText = label.toLowerCase();
    const relatedEvents = events.filter((event) => eventText(event).includes(selectionText.split(' ')[0] ?? selectionText));

    let score = 0.45;
    const confidenceSamples = relatedEvents.map(confidenceFromEvent).filter((value): value is number => value !== null);
    if (confidenceSamples.length > 0) {
      score += confidenceSamples.reduce((sum, value) => sum + value, 0) / confidenceSamples.length;
    }
    if (relatedEvents.length >= 3) score += 0.2;

    const hasVolatility = relatedEvents.some((event) => {
      const text = eventText(event);
      return text.includes('volatile') || text.includes('variance');
    });
    const hasInjury = relatedEvents.some((event) => eventText(event).includes('injur'));

    if (hasVolatility) score -= 0.2;
    if (hasInjury) score -= 0.15;

    const normalizedScore = Math.max(0, Math.min(1, score));
    const evidenceStrength = normalizedScore > 0.75 ? 'High' : normalizedScore > 0.52 ? 'Medium' : 'Low';
    const volatility = hasVolatility ? 'High variance' : hasInjury ? 'Risky' : 'Solid';

    const note =
      relatedEvents.length > 0
        ? `${relatedEvents[0]?.event_name.replaceAll('_', ' ')} backed this leg.`
        : 'Evidence building: limited signals detected.';

    return {
      legId,
      legLabel: label,
      lineOdds: `${leg.line ?? leg.market ?? 'Line n/a'}${leg.odds ? ` · ${leg.odds}` : ''}`,
      trend: relatedEvents.length > 1 ? 'Up' : 'Flat',
      evidenceStrength,
      volatility,
      note,
      score: normalizedScore,
      relatedEvents
    };
  });
}

export function deriveSlipVerdict(events: ControlPlaneEvent[], legs: SlipLeg[] = []): SlipVerdictModel {
  const legRows = deriveLegInsights(events, legs);
  const meanScore = legRows.length > 0 ? legRows.reduce((sum, row) => sum + row.score, 0) / legRows.length : 0;
  const confidenceSamples = events.map(confidenceFromEvent).filter((value): value is number => value !== null);
  const confidence = confidenceSamples.length > 0 ? confidenceSamples.reduce((sum, value) => sum + value, 0) / confidenceSamples.length : meanScore;

  const flags = deriveRiskFlags(events, legs);
  const riskLevel: SlipVerdictModel['riskLevel'] = flags.length >= 3 ? 'High' : flags.length >= 2 ? 'Medium' : 'Low';
  const rating: SlipVerdictModel['rating'] = confidence > 0.78 ? 'A' : confidence > 0.63 ? 'B' : confidence > 0.48 ? 'C' : 'D';

  const sorted = [...legRows].sort((a, b) => b.score - a.score);
  return {
    rating,
    confidence,
    confidenceLabel: confidence > 0.72 ? 'High' : confidence > 0.52 ? 'Medium' : 'Low',
    riskLevel,
    strongestLeg: sorted[0]?.legLabel ?? null,
    weakestLeg: sorted.at(-1)?.legLabel ?? null,
    reasons: deriveReasons(events),
    riskFlags: flags,
    hasSignals: events.length > 0 || legs.length > 0
  };
}
