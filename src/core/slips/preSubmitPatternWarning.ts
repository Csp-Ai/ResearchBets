import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import type { BettorMistakePatternSummary } from '@/src/core/postmortem/patterns';
import type { CauseTag, ConfidenceLevel } from '@/src/core/postmortem/attribution';

export type PreSubmitWarningLevel = 'high' | 'medium' | 'low' | 'none';

export type PreSubmitMatchedPattern = {
  tag: CauseTag;
  reason: string;
};

export type PreSubmitPatternWarning = {
  warning_level: PreSubmitWarningLevel;
  matched_patterns: PreSubmitMatchedPattern[];
  recommendation_summary: string;
  sample_size: number;
  confidence_level: ConfidenceLevel;
  suppression_reason?: string;
};

const MIN_HISTORY_TO_SHOW = 2;
const MIN_HISTORY_FOR_MEDIUM = 3;
const MAX_MATCHED_PATTERNS = 3;

const AGGRESSIVE_MARKETS = new Set<SlipBuilderLeg['marketType']>(['points', 'threes', 'assists']);
const OVER_STYLE_MARKETS = new Set<SlipBuilderLeg['marketType']>(['points', 'threes', 'assists', 'rebounds', 'pra', 'ra']);

const parseLine = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseOdds = (value?: string): number | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) return null;
  return Number(trimmed);
};

const normalizeText = (value?: string): string => value?.trim().toLowerCase() ?? '';

const uniqueCount = (values: Array<string | undefined>): number =>
  new Set(values.map((value) => normalizeText(value)).filter(Boolean)).size;

export function lineLooksAggressive(leg: SlipBuilderLeg): boolean {
  const line = parseLine(leg.line);
  const odds = parseOdds(leg.odds);
  if (line === null || !AGGRESSIVE_MARKETS.has(leg.marketType)) return false;

  if (leg.marketType === 'points') return line >= 30 || (odds !== null && odds >= 120);
  if (leg.marketType === 'threes') return line >= 4.5 || (odds !== null && odds >= 120);
  if (leg.marketType === 'assists') return line >= 9.5 || (odds !== null && odds >= 120);
  return false;
}

function blowoutSignal(leg: SlipBuilderLeg): boolean {
  const joined = [leg.deadLegRisk, ...(leg.deadLegReasons ?? [])].join(' ').toLowerCase();
  return /blowout|mismatch|rest risk|garbage time/.test(joined);
}

function legLooksLikeStarterOver(leg: SlipBuilderLeg): boolean {
  return OVER_STYLE_MARKETS.has(leg.marketType) && !normalizeText(leg.odds).includes('under');
}

function buildRecommendation(input: {
  matches: PreSubmitMatchedPattern[];
  sampleSize: number;
  confidenceLevel: ConfidenceLevel;
  aggressiveLegCount: number;
  correlationLegCount: number;
  blowoutLegCount: number;
}): string {
  const primary = input.matches[0];
  if (!primary) {
    return input.sampleSize === 0
      ? 'No reviewed slip history yet, so no pre-submit pattern warning is available.'
      : 'No recurring reviewed pattern is close enough to this slip to show a warning.';
  }

  let base = primary.reason;
  if (primary.tag === 'line_too_aggressive') {
    base = `Your reviewed history shows repeated misses on aggressive ladders. This slip contains ${input.aggressiveLegCount} similar threshold leg${input.aggressiveLegCount === 1 ? '' : 's'}.`;
  } else if (primary.tag === 'correlated_legs') {
    base = `Your reviewed history shows repeated misses from correlated stacks. This slip contains ${input.correlationLegCount} leg${input.correlationLegCount === 1 ? '' : 's'} tied to the same player, team, or game script.`;
  } else if (primary.tag === 'blowout_minutes_risk') {
    base = `Your reviewed history shows repeat misses when starter overs depend on stable minutes. This slip contains ${input.blowoutLegCount} leg${input.blowoutLegCount === 1 ? '' : 's'} with blowout-style script risk.`;
  }

  if (input.sampleSize < MIN_HISTORY_FOR_MEDIUM || input.confidenceLevel === 'low') {
    return `${base} Limited history: this warning is low-confidence.`;
  }

  return base;
}

function warningLevelFor(input: {
  matchCount: number;
  confidenceLevel: ConfidenceLevel;
  sampleSize: number;
}): PreSubmitWarningLevel {
  if (input.matchCount === 0) return 'none';
  if (input.confidenceLevel === 'high' && input.matchCount >= 2 && input.sampleSize >= 4) return 'high';
  if (input.sampleSize >= MIN_HISTORY_FOR_MEDIUM && input.confidenceLevel !== 'low') return 'medium';
  return 'low';
}

export function buildPreSubmitPatternWarning(input: {
  slip: SlipBuilderLeg[];
  patternSummary: BettorMistakePatternSummary;
}): PreSubmitPatternWarning {
  const { slip, patternSummary } = input;
  const base = {
    sample_size: patternSummary.sample_size,
    confidence_level: patternSummary.confidence_level
  } satisfies Pick<PreSubmitPatternWarning, 'sample_size' | 'confidence_level'>;

  if (slip.length === 0) {
    return {
      warning_level: 'none',
      matched_patterns: [],
      recommendation_summary: 'Add at least one leg to evaluate pre-submit pattern guardrails.',
      suppression_reason: 'empty_slip',
      ...base
    };
  }

  if (patternSummary.sample_size === 0) {
    return {
      warning_level: 'none',
      matched_patterns: [],
      recommendation_summary: 'No reviewed slip history yet, so no pre-submit pattern warning is available.',
      suppression_reason: 'no_reviewed_history',
      ...base
    };
  }

  if (patternSummary.sample_size < MIN_HISTORY_TO_SHOW) {
    return {
      warning_level: 'none',
      matched_patterns: [],
      recommendation_summary: `Only ${patternSummary.sample_size} reviewed slip${patternSummary.sample_size === 1 ? '' : 's'} ${patternSummary.sample_size === 1 ? 'is' : 'are'} available, so pre-submit pattern warnings stay suppressed until more real review history exists.`,
      suppression_reason: 'insufficient_history',
      ...base
    };
  }

  const recurringTags = new Set(patternSummary.recurring_tags.map((item) => item.tag));
  const aggressiveLegs = slip.filter(lineLooksAggressive);
  const sameGameCount = Math.max(
    0,
    ...Object.values(
      slip.reduce<Record<string, number>>((acc, leg) => {
        const key = normalizeText(leg.game) || 'unknown';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {})
    )
  );
  const playerDuplicateCount = slip.length - uniqueCount(slip.map((leg) => leg.player));
  const teamishDuplicateCount = slip.length - uniqueCount(slip.map((leg) => leg.game));
  const correlatedLegCount =
    sameGameCount >= 2 || playerDuplicateCount > 0 || teamishDuplicateCount > 0
      ? Math.max(sameGameCount, playerDuplicateCount + 1, Math.min(slip.length, teamishDuplicateCount + 1))
      : 0;
  const blowoutLegs = slip.filter((leg) => legLooksLikeStarterOver(leg) && blowoutSignal(leg));

  const matches: PreSubmitMatchedPattern[] = [];

  if (recurringTags.has('line_too_aggressive') && aggressiveLegs.length >= 2) {
    matches.push({
      tag: 'line_too_aggressive',
      reason: `Reviewed losses repeatedly tagged aggressive lines, and this slip carries ${aggressiveLegs.length} high-threshold ladder leg${aggressiveLegs.length === 1 ? '' : 's'}.`
    });
  }

  if (recurringTags.has('correlated_legs') && correlatedLegCount >= 2) {
    matches.push({
      tag: 'correlated_legs',
      reason: `Reviewed losses repeatedly tagged correlated legs, and this slip stacks ${correlatedLegCount} leg${correlatedLegCount === 1 ? '' : 's'} through one player/team/game script.`
    });
  }

  if (recurringTags.has('blowout_minutes_risk') && blowoutLegs.length >= 1) {
    matches.push({
      tag: 'blowout_minutes_risk',
      reason: `Reviewed losses repeatedly tagged blowout minutes risk, and this slip includes ${blowoutLegs.length} over-style leg${blowoutLegs.length === 1 ? '' : 's'} already carrying similar script pressure.`
    });
  }

  const matchedPatterns = matches.slice(0, MAX_MATCHED_PATTERNS);
  if (matchedPatterns.length === 0) {
    return {
      warning_level: 'none',
      matched_patterns: [],
      recommendation_summary: 'No recurring reviewed pattern is close enough to this slip to show a warning.',
      suppression_reason: 'no_pattern_match',
      ...base
    };
  }

  return {
    warning_level: warningLevelFor({
      matchCount: matchedPatterns.length,
      confidenceLevel: patternSummary.confidence_level,
      sampleSize: patternSummary.sample_size
    }),
    matched_patterns: matchedPatterns,
    recommendation_summary: buildRecommendation({
      matches: matchedPatterns,
      sampleSize: patternSummary.sample_size,
      confidenceLevel: patternSummary.confidence_level,
      aggressiveLegCount: aggressiveLegs.length,
      correlationLegCount: correlatedLegCount,
      blowoutLegCount: blowoutLegs.length
    }),
    ...base
  };
}
