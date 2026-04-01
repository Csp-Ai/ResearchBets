import type { SlipStructureReport } from '@/src/core/contracts/slipStructureReport';
import { buildWeakestLegIdentity } from '@/src/core/decision/lifecycleDecision';
import type { LifecycleDriverLineage, WeakestLegIdentity } from '@/src/core/decision/lifecycleDecision';

export type PostmortemOutcome = 'win' | 'loss' | 'push' | 'partial';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type CauseTag =
  | 'line_too_aggressive'
  | 'role_mismatch'
  | 'blowout_minutes_risk'
  | 'low_usage_player'
  | 'efficiency_variance'
  | 'correlated_legs'
  | 'late_game_inactivity'
  | 'injury_or_rotation_shift';
export type LegOutcomeStatus = 'hit' | 'miss' | 'pending';

export type WeakestLegAttribution = {
  leg_id: string;
  player: string | null;
  prop_type: string | null;
  expected_vs_actual?: string;
  status: LegOutcomeStatus;
};

export type PostmortemAttribution = {
  trace_id?: string;
  slip_id?: string;
  outcome: PostmortemOutcome;
  breaker_leg_id?: string;
  weakest_leg?: WeakestLegAttribution;
  cause_tags: CauseTag[];
  confidence_level: ConfidenceLevel;
  summary_explanation: string;
  narrative: string;
  lifecycle_lineage?: LifecycleDriverLineage;
  weakest_leg_identity?: WeakestLegIdentity;
};

export type PostmortemLegInput = {
  id?: string;
  selection?: string;
  riskFlags?: string[];
  market?: string;
  line?: string;
  odds?: string;
  team?: string;
  player?: string;
  game?: string;
  status?: LegOutcomeStatus;
  actual?: number | null;
  target?: number | null;
  expected?: number | null;
  current?: number | null;
  result?: number | null;
  scoreDelta?: number | null;
  minutesTrend?: 'stable' | 'down' | 'up';
  role?: 'scorer' | 'facilitator' | 'rebounder' | 'balanced';
};

const includesAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term));

const toNumber = (value?: string | number | null): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const normalizeText = (value: string | undefined): string => (value ?? '').toLowerCase();

const inferPropType = (leg: PostmortemLegInput): string | null => {
  const market = normalizeText(leg.market);
  const selection = normalizeText(leg.selection);
  const text = `${market} ${selection}`;
  if (includesAny(text, ['point', 'pts'])) return 'points';
  if (includesAny(text, ['assist', 'ast'])) return 'assists';
  if (includesAny(text, ['rebound', 'reb'])) return 'rebounds';
  if (includesAny(text, ['three', '3pt', '3-p'])) return 'threes';
  if (includesAny(text, ['steal'])) return 'steals';
  if (includesAny(text, ['block'])) return 'blocks';
  return leg.market ?? null;
};

const inferRole = (leg: PostmortemLegInput, propType: string | null): PostmortemLegInput['role'] => {
  if (leg.role) return leg.role;
  if (propType === 'assists') return 'facilitator';
  if (propType === 'rebounds') return 'rebounder';
  if (propType === 'points' || propType === 'threes') return 'scorer';
  return 'balanced';
};

const inferStatus = (leg: PostmortemLegInput): LegOutcomeStatus => {
  if (leg.status) return leg.status;
  const target = leg.target ?? toNumber(leg.line);
  const actual = leg.actual ?? leg.current ?? leg.result ?? leg.expected ?? null;
  if (target == null || actual == null) return 'pending';
  return actual >= target ? 'hit' : 'miss';
};

const describeExpectedVsActual = (leg: PostmortemLegInput, propType: string | null): string | undefined => {
  const target = leg.target ?? toNumber(leg.line);
  const actual = leg.actual ?? leg.current ?? leg.result ?? leg.expected ?? null;
  if (target == null || actual == null) return undefined;
  const label = propType ?? 'stat';
  return `${actual}/${target} ${label}`;
};

const volatilityScore = (propType: string | null): number => {
  switch (propType) {
    case 'threes':
    case 'blocks':
    case 'steals':
      return 18;
    case 'points':
      return 12;
    case 'assists':
      return 10;
    case 'rebounds':
      return 8;
    default:
      return 9;
  }
};

const computeLineGap = (leg: PostmortemLegInput): number => {
  const target = leg.target ?? toNumber(leg.line) ?? 0;
  const expected = leg.expected ?? leg.current ?? leg.actual ?? leg.result ?? 0;
  return target - expected;
};

const computeWeakestLegScore = (
  leg: PostmortemLegInput,
  report: SlipStructureReport | undefined,
  propType: string | null,
  status: LegOutcomeStatus
): number => {
  const reportLeg = report?.legs.find((entry) => entry.leg_id === leg.id);
  let score = volatilityScore(propType) + computeLineGap(leg) * 4 + (reportLeg?.fragility_score ?? 0) * 0.5;
  if (status === 'miss') score += 80;
  if (status === 'pending') score += 25;
  if (status === 'hit') score -= 20;
  if (leg.minutesTrend === 'down') score += 16;
  if ((leg.riskFlags ?? []).length > 0) score += Math.min(18, leg.riskFlags!.length * 4);
  return score;
};

const dedupe = <T,>(items: T[]): T[] => Array.from(new Set(items));

export function computePostmortemAttribution(input: {
  trace_id?: string;
  slip_id?: string;
  outcome: PostmortemOutcome;
  legs: PostmortemLegInput[];
  report?: SlipStructureReport;
  parse_status?: 'success' | 'partial' | 'failed';
}): PostmortemAttribution | null {
  if (input.parse_status === 'failed') return null;
  if (input.legs.length === 0) return null;

  const weakestCandidate = input.legs
    .map((leg, index) => {
      const propType = inferPropType(leg);
      const status = inferStatus(leg);
      return {
        leg,
        index,
        propType,
        status,
        score: computeWeakestLegScore(leg, input.report, propType, status)
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)[0];

  if (!weakestCandidate?.leg.id) return null;

  const samePlayerLegCount = input.legs.filter(
    (leg) => leg.player && weakestCandidate.leg.player && leg.player === weakestCandidate.leg.player
  ).length;
  const joined = `${normalizeText(weakestCandidate.leg.selection)} ${normalizeText(weakestCandidate.leg.market)} ${(weakestCandidate.leg.riskFlags ?? []).join(' ').toLowerCase()}`;
  const lineGap = computeLineGap(weakestCandidate.leg);
  const causeTags: CauseTag[] = [];
  const role = inferRole(weakestCandidate.leg, weakestCandidate.propType);

  if (lineGap >= 2 || includesAny(joined, ['alt line', 'ladder', 'line moved', 'steam', 'drift'])) {
    causeTags.push('line_too_aggressive');
  }

  if (
    (role === 'facilitator' && weakestCandidate.propType === 'points') ||
    (role === 'scorer' && weakestCandidate.propType === 'assists')
  ) {
    causeTags.push('role_mismatch');
  }

  if (
    weakestCandidate.leg.minutesTrend === 'down' ||
    includesAny(joined, ['blowout', 'garbage time', 'rest risk'])
  ) {
    causeTags.push('blowout_minutes_risk');
  }

  if (
    includesAny(joined, ['bench', 'low usage', 'spot-up', 'limited touches']) ||
    (role === 'balanced' && weakestCandidate.propType === 'points' && lineGap >= 3)
  ) {
    causeTags.push('low_usage_player');
  }

  if (
    weakestCandidate.propType === 'threes' ||
    includesAny(joined, ['cold shooting', 'efficiency', 'variance'])
  ) {
    causeTags.push('efficiency_variance');
  }

  if (
    samePlayerLegCount >= 2 ||
    input.report?.correlation_edges.some(
      (edge) => edge.a_leg_id === weakestCandidate.leg.id || edge.b_leg_id === weakestCandidate.leg.id
    )
  ) {
    causeTags.push('correlated_legs');
  }

  if (
    includesAny(joined, ['late game', 'fourth quarter', 'second half', 'inactivity']) ||
    (weakestCandidate.status !== 'hit' && (weakestCandidate.leg.actual ?? weakestCandidate.leg.current ?? 0) > 0 && lineGap >= 1.5)
  ) {
    causeTags.push('late_game_inactivity');
  }

  if (
    includesAny(joined, ['injury', 'questionable', 'out', 'rotation']) ||
    weakestCandidate.leg.minutesTrend === 'down'
  ) {
    causeTags.push('injury_or_rotation_shift');
  }

  const finalTags = dedupe(causeTags);
  if (finalTags.length === 0) finalTags.push('efficiency_variance');

  const confidenceLevel: ConfidenceLevel =
    finalTags.length >= 2 && weakestCandidate.status !== 'pending'
      ? 'high'
      : input.parse_status === 'partial' || weakestCandidate.status === 'pending'
        ? 'low'
        : 'medium';

  const weakestLeg: WeakestLegAttribution = {
    leg_id: weakestCandidate.leg.id,
    player: weakestCandidate.leg.player ?? null,
    prop_type: weakestCandidate.propType,
    expected_vs_actual: describeExpectedVsActual(weakestCandidate.leg, weakestCandidate.propType),
    status: weakestCandidate.status
  };

  const playerLabel = weakestLeg.player ?? 'This leg';
  const propLabel = weakestLeg.prop_type ?? 'prop';
  const tagCopy = finalTags.map((tag) => tag.replace(/_/g, ' ')).join(' and ');
  const summary = `${playerLabel} ${propLabel} carried the most risk due to ${tagCopy}.`;

  return {
    trace_id: input.trace_id,
    slip_id: input.slip_id,
    outcome: input.outcome,
    breaker_leg_id: weakestLeg.leg_id,
    weakest_leg: weakestLeg,
    cause_tags: finalTags,
    confidence_level: confidenceLevel,
    summary_explanation: summary,
    narrative: summary,
    weakest_leg_identity: buildWeakestLegIdentity({
      canonical_leg_id: weakestLeg.leg_id,
      stage_role: 'breaking_leg',
      source_stage: 'review',
      previous_leg_id: input.report?.lifecycle_driver_lineage?.pregame?.canonical_leg_id,
      supporting_drivers: finalTags.slice(0, 2).map((tag) => {
        if (tag === 'correlated_legs') return 'correlated_stack_pressure';
        if (tag === 'line_too_aggressive') return 'inflated_thresholds';
        if (tag === 'late_game_inactivity' || tag === 'blowout_minutes_risk') return 'late_game_dependency';
        if (tag === 'role_mismatch' || tag === 'low_usage_player') return 'role_mismatch';
        if (tag === 'efficiency_variance') return 'hot_hand_regression_risk';
        return 'low_evidence';
      })
    }),
    lifecycle_lineage: {
      ...(input.report?.lifecycle_driver_lineage ?? {}),
      settled: buildWeakestLegIdentity({
        canonical_leg_id: weakestLeg.leg_id,
        stage_role: 'breaking_leg',
        source_stage: 'review',
        previous_leg_id: input.report?.lifecycle_driver_lineage?.live?.canonical_leg_id ??
          input.report?.lifecycle_driver_lineage?.pregame?.canonical_leg_id
      })
    }
  };
}
