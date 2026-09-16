import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { buildLoopProvenance } from '@/src/core/bettor-loop/provenance';
import type { QuerySpine } from '@/src/core/nervous/spine';
import type { DraftSlipState } from '@/src/core/slips/draftSlipStore';
import type { ParseConfidence, TrackedTicket, TrackedTicketLeg } from '@/src/core/track/types';

const NFL_MARKETS = new Set<SlipBuilderLeg['marketType']>([
  'passing_yards',
  'passing_tds',
  'rushing_yards',
  'rushing_receiving_yards',
  'receiving_yards',
  'receptions',
  'carries',
  'anytime_td',
]);

const parseThreshold = (line: string): number => {
  const match = line.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const parseDirection = (line: string): 'over' | 'under' =>
  /\bunder\b/i.test(line) ? 'under' : 'over';

const confidenceFor = (leg: SlipBuilderLeg): ParseConfidence => {
  if (leg.deadLegRisk === 'high') return 'low';
  if (typeof leg.confidence === 'number') {
    if (leg.confidence >= 0.7) return 'high';
    if (leg.confidence >= 0.5) return 'medium';
    return 'low';
  }
  return 'medium';
};

const sourceLooksParserDerived = (legs: SlipBuilderLeg[]) =>
  legs.some((leg) =>
    (leg.deadLegReasons ?? []).some((reason) => /parser|review before trust|ocr/i.test(reason)),
  );

const hash = (input: string) => {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(16);
};

const fallbackTicketId = (legs: SlipBuilderLeg[]) =>
  `ticket_draft_${hash(
    legs
      .map((leg) => `${leg.id}|${leg.player}|${leg.marketType}|${leg.line}`)
      .sort()
      .join('||'),
  )}`;

const toTrackedLeg = (leg: SlipBuilderLeg, index: number): TrackedTicketLeg => {
  const confidence = confidenceFor(leg);
  const nfl = NFL_MARKETS.has(leg.marketType);
  return {
    legId: leg.id || `draft-leg-${index + 1}`,
    league: nfl ? 'NFL' : 'NBA',
    gameId: leg.game,
    teams: leg.game,
    player: leg.player,
    rawPlayer: leg.player,
    marketType: leg.marketType,
    marketLabel: leg.marketType.replace(/_/g, ' '),
    threshold: leg.marketType === 'anytime_td' ? 1 : parseThreshold(leg.line),
    direction: parseDirection(leg.line),
    odds: leg.odds,
    source: sourceLooksParserDerived([leg]) ? 'xray_parser' : 'xray_draft',
    parseConfidence: confidence,
    needsReview: confidence === 'low',
    rawText: `${leg.player} ${leg.line}${leg.odds ? ` ${leg.odds}` : ''}`,
    ladder: /\+/.test(leg.line),
  };
};

export function draftSlipToTrackedTicket(input: {
  draft: DraftSlipState;
  spine: QuerySpine;
  now?: string;
}): TrackedTicket {
  const { draft, spine } = input;
  const createdAt = input.now ?? new Date().toISOString();
  const parserDerived = sourceLooksParserDerived(draft.legs);
  const hasReviewFlags = draft.legs.some((leg) => leg.deadLegRisk === 'high');
  const ticketId = draft.slip_id
    ? `ticket_${draft.slip_id}`
    : draft.trace_id
      ? `ticket_${draft.trace_id}`
      : fallbackTicketId(draft.legs);

  return {
    ticketId,
    createdAt,
    sourceHint: parserDerived ? 'screenshot' : 'xray',
    rawSlipText: draft.legs
      .map((leg) => `${leg.player} ${leg.line}${leg.odds ? ` (${leg.odds})` : ''}`)
      .join('\n'),
    legs: draft.legs.map(toTrackedLeg),
    trace_id: draft.trace_id ?? spine.trace_id,
    slip_id: draft.slip_id ?? spine.slip_id,
    sport: spine.sport,
    tz: spine.tz,
    date: spine.date,
    mode: spine.mode,
    provenance: buildLoopProvenance({
      mode: spine.mode,
      sourceType: parserDerived ? 'parser_derived' : 'board_staged',
      reviewState: hasReviewFlags ? 'unreviewed' : 'reviewed',
    }),
  };
}
