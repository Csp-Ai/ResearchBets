import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import type { BettorMistakePatternSummary } from '@/src/core/postmortem/patterns';
import type { CauseTag, ConfidenceLevel } from '@/src/core/postmortem/attribution';

export type PreSubmitWarningLevel = 'high' | 'medium' | 'low' | 'none';
export type SuggestedFixType =
  | 'lower_threshold'
  | 'reduce_correlation'
  | 'swap_stat_type'
  | 'reduce_blowout_exposure'
  | 'trim_leg_count';

export type PreSubmitMatchedPattern = {
  tag: CauseTag;
  reason: string;
};

export type PreSubmitSuggestedFix = {
  fix_type: SuggestedFixType;
  title: string;
  explanation: string;
  affected_legs: string[];
  suggested_action: string;
  confidence_level: ConfidenceLevel;
};

export type PreSubmitPatternWarning = {
  warning_level: PreSubmitWarningLevel;
  matched_patterns: PreSubmitMatchedPattern[];
  recommendation_summary: string;
  suggested_fixes: PreSubmitSuggestedFix[];
  sample_size: number;
  confidence_level: ConfidenceLevel;
  suppression_reason?: string;
};

const MIN_HISTORY_TO_SHOW = 2;
const MIN_HISTORY_FOR_MEDIUM = 3;
const MAX_MATCHED_PATTERNS = 3;
const MAX_SUGGESTED_FIXES = 3;
const TRIM_LEG_COUNT_THRESHOLD = 5;

const AGGRESSIVE_MARKETS = new Set<SlipBuilderLeg['marketType']>(['points', 'threes', 'assists']);
const OVER_STYLE_MARKETS = new Set<SlipBuilderLeg['marketType']>(['points', 'threes', 'assists', 'rebounds', 'pra', 'ra']);
const BLOWOUT_SWAP_MARKETS = new Set<SlipBuilderLeg['marketType']>(['points', 'threes']);

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

const titleCase = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

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

type SlipPatternSignals = {
  aggressiveLegs: SlipBuilderLeg[];
  correlatedLegs: SlipBuilderLeg[];
  blowoutLegs: SlipBuilderLeg[];
};

type RankedFix = PreSubmitSuggestedFix & {
  rankingScore: number;
  alignmentScore: number;
  riskReductionScore: number;
  simplicityScore: number;
};

function pickLowestConfidenceLegs(legs: SlipBuilderLeg[], count: number): SlipBuilderLeg[] {
  return [...legs]
    .sort((a, b) => {
      const confidenceDiff = (a.confidence ?? -1) - (b.confidence ?? -1);
      if (confidenceDiff !== 0) return confidenceDiff;
      const volatilityRank = { high: 0, medium: 1, low: 2 } as const;
      const volatilityDiff = (volatilityRank[a.volatility ?? 'medium'] ?? 1) - (volatilityRank[b.volatility ?? 'medium'] ?? 1);
      if (volatilityDiff !== 0) return volatilityDiff;
      return a.id.localeCompare(b.id);
    })
    .slice(0, count);
}

function describeLegs(legs: SlipBuilderLeg[]): string {
  const labels = legs.map((leg) => `${leg.player} ${titleCase(leg.marketType)}`);
  if (labels.length <= 1) return labels[0] ?? 'this leg';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
}

function buildSuggestedFixes(input: {
  slip: SlipBuilderLeg[];
  patternSummary: BettorMistakePatternSummary;
  matches: PreSubmitMatchedPattern[];
  signals: SlipPatternSignals;
}): PreSubmitSuggestedFix[] {
  const fixCandidates: RankedFix[] = [];
  const pushFix = (fix: Omit<RankedFix, 'rankingScore'>) => {
    fixCandidates.push({ ...fix, rankingScore: fix.riskReductionScore * 100 + fix.simplicityScore * 10 + fix.alignmentScore });
  };

  const confidenceLevel: ConfidenceLevel =
    input.patternSummary.sample_size < MIN_HISTORY_FOR_MEDIUM || input.patternSummary.confidence_level === 'low'
      ? 'low'
      : input.patternSummary.confidence_level;
  const matchedTags = new Set(input.matches.map((match) => match.tag));

  if (matchedTags.has('line_too_aggressive') && input.signals.aggressiveLegs.length >= 2) {
    const aggressiveTargets = [...input.signals.aggressiveLegs]
      .sort((a, b) => {
        const oddsDiff = (parseOdds(b.odds) ?? Number.NEGATIVE_INFINITY) - (parseOdds(a.odds) ?? Number.NEGATIVE_INFINITY);
        if (oddsDiff !== 0) return oddsDiff;
        const lineDiff = (parseLine(b.line) ?? 0) - (parseLine(a.line) ?? 0);
        if (lineDiff !== 0) return lineDiff;
        return a.id.localeCompare(b.id);
      })
      .slice(0, Math.min(2, input.signals.aggressiveLegs.length));

    pushFix({
      fix_type: 'lower_threshold',
      title: 'Lower one ladder threshold',
      explanation:
        confidenceLevel === 'low'
          ? 'This recurring pattern is directionally similar, but the reviewed sample is still thin.'
          : 'The matched pattern is aggressive ladder exposure, so the cleanest fix is to keep the angle but bring one threshold back into a more normal range.',
      affected_legs: aggressiveTargets.map((leg) => leg.id),
      suggested_action: `Keep the same read, but step down one of the longest ladder legs first — start with ${describeLegs(aggressiveTargets)}.`,
      confidence_level: confidenceLevel,
      alignmentScore: 5,
      riskReductionScore: 5,
      simplicityScore: 5
    });

    if (input.signals.aggressiveLegs.length >= 3 || input.slip.length >= TRIM_LEG_COUNT_THRESHOLD) {
      const trimTargets = pickLowestConfidenceLegs(input.signals.aggressiveLegs, 2);
      pushFix({
        fix_type: 'trim_leg_count',
        title: 'Trim the thinnest ladder leg',
        explanation:
          'When several aggressive legs sit in the same slip, removing the weakest-priced threshold usually cuts risk faster than rewriting the whole ticket.',
        affected_legs: trimTargets.map((leg) => leg.id),
        suggested_action: `If you want a simpler version, drop the weakest ladder leg before adding anything new — ${describeLegs(trimTargets)} is the first trim candidate.`,
        confidence_level: confidenceLevel,
        alignmentScore: 4,
        riskReductionScore: 4,
        simplicityScore: 4
      });
    }
  }

  if (matchedTags.has('correlated_legs') && input.signals.correlatedLegs.length >= 2) {
    const correlationTargets = pickLowestConfidenceLegs(input.signals.correlatedLegs, Math.min(2, input.signals.correlatedLegs.length));
    pushFix({
      fix_type: 'reduce_correlation',
      title: 'Break one same-script dependency',
      explanation:
        'The recurring miss pattern is same-script concentration, so reducing one shared player/team/game dependency is the highest-signal fix.',
      affected_legs: correlationTargets.map((leg) => leg.id),
      suggested_action: `Keep one core angle, but replace one dependent leg with something from a different game or player role — start with ${describeLegs(correlationTargets)}.`,
      confidence_level: confidenceLevel,
      alignmentScore: 5,
      riskReductionScore: 4,
      simplicityScore: 4
    });

    const swapTargets = input.signals.correlatedLegs.filter((leg) => AGGRESSIVE_MARKETS.has(leg.marketType)).slice(0, 2);
    if (swapTargets.length >= 1) {
      pushFix({
        fix_type: 'swap_stat_type',
        title: 'Swap one dependent stat type',
        explanation:
          'A role-based stat can keep the same player read while reducing how much the slip depends on one scoring script.',
        affected_legs: swapTargets.map((leg) => leg.id),
        suggested_action: `Instead of stacking another scoring-dependent look, consider a more independent role stat for ${describeLegs(swapTargets)} if your board already offers one.`,
        confidence_level: confidenceLevel,
        alignmentScore: 4,
        riskReductionScore: 4,
        simplicityScore: 3
      });
    }
  }

  if (matchedTags.has('blowout_minutes_risk') && input.signals.blowoutLegs.length >= 1) {
    const blowoutTargets = pickLowestConfidenceLegs(input.signals.blowoutLegs, Math.min(2, input.signals.blowoutLegs.length));
    pushFix({
      fix_type: 'reduce_blowout_exposure',
      title: 'Reduce starter-over blowout exposure',
      explanation:
        confidenceLevel === 'low'
          ? 'The reviewed pattern is still low-confidence, so this stays a light caution instead of a strong instruction.'
          : 'These legs already carry mismatch-style minutes pressure, so reducing exposure there aligns directly with the recurring reviewed miss.',
      affected_legs: blowoutTargets.map((leg) => leg.id),
      suggested_action: `If this game script stays lopsided, pull back one starter over first — ${describeLegs(blowoutTargets)} is the clearest pressure point.`,
      confidence_level: confidenceLevel,
      alignmentScore: 5,
      riskReductionScore: 5,
      simplicityScore: 4
    });

    const swapTargets = input.signals.blowoutLegs.filter((leg) => BLOWOUT_SWAP_MARKETS.has(leg.marketType)).slice(0, 2);
    if (swapTargets.length >= 1) {
      pushFix({
        fix_type: 'swap_stat_type',
        title: 'Shift away from scoring ladders',
        explanation:
          'When minutes downside is the recurring issue, rebounds or assists usually rely less on a perfect scoring environment than a points ladder does.',
        affected_legs: swapTargets.map((leg) => leg.id),
        suggested_action: `For ${describeLegs(swapTargets)}, prefer a lower-threshold or support-stat version of the same read if your current board already supports it.`,
        confidence_level: confidenceLevel,
        alignmentScore: 4,
        riskReductionScore: 4,
        simplicityScore: 3
      });
    }
  }

  if (input.matches.length > 0 && input.slip.length >= TRIM_LEG_COUNT_THRESHOLD) {
    const trimTargets = pickLowestConfidenceLegs(input.slip, Math.min(2, input.slip.length - 3));
    if (trimTargets.length > 0) {
      pushFix({
        fix_type: 'trim_leg_count',
        title: 'Trim the lowest-confidence leg',
        explanation:
          'Once the slip gets long, a single weak leg can add more failure paths than signal. Shortening the ticket is often the simplest structural fix.',
        affected_legs: trimTargets.map((leg) => leg.id),
        suggested_action: `If you want to keep the main story but lower fragility, cut the weakest-confidence add-on first — ${describeLegs(trimTargets)} is the most direct trim.`,
        confidence_level: confidenceLevel,
        alignmentScore: 3,
        riskReductionScore: 3,
        simplicityScore: 4
      });
    }
  }

  return fixCandidates
    .sort((a, b) => b.rankingScore - a.rankingScore || a.title.localeCompare(b.title))
    .filter((fix, index, fixes) =>
      fixes.findIndex(
        (candidate) =>
          candidate.fix_type === fix.fix_type &&
          candidate.affected_legs.join('|') === fix.affected_legs.join('|')
      ) === index
    )
    .slice(0, MAX_SUGGESTED_FIXES)
    .map((fix) => ({
      fix_type: fix.fix_type,
      title: fix.title,
      explanation: fix.explanation,
      affected_legs: fix.affected_legs,
      suggested_action: fix.suggested_action,
      confidence_level: fix.confidence_level
    }));
}

function collectSignals(slip: SlipBuilderLeg[]): SlipPatternSignals {
  const aggressiveLegs = slip.filter(lineLooksAggressive);
  const sameGameKey = Object.entries(
    slip.reduce<Record<string, SlipBuilderLeg[]>>((acc, leg) => {
      const key = normalizeText(leg.game) || 'unknown';
      acc[key] = [...(acc[key] ?? []), leg];
      return acc;
    }, {})
  ).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0]?.[1] ?? [];

  const playerGroups = Object.values(
    slip.reduce<Record<string, SlipBuilderLeg[]>>((acc, leg) => {
      const key = normalizeText(leg.player);
      if (!key) return acc;
      acc[key] = [...(acc[key] ?? []), leg];
      return acc;
    }, {})
  );
  const duplicatedPlayers = playerGroups
    .filter((group) => group.length >= 2)
    .sort((a, b) => b.length - a.length || a[0]!.player.localeCompare(b[0]!.player))[0] ?? [];

  const correlatedLegs = duplicatedPlayers.length >= 2
    ? duplicatedPlayers
    : sameGameKey.length >= 2
      ? sameGameKey
      : [];

  const blowoutLegs = slip.filter((leg) => legLooksLikeStarterOver(leg) && blowoutSignal(leg));
  return { aggressiveLegs, correlatedLegs, blowoutLegs };
}

export function buildPreSubmitPatternWarning(input: {
  slip: SlipBuilderLeg[];
  patternSummary: BettorMistakePatternSummary;
}): PreSubmitPatternWarning {
  const { slip, patternSummary } = input;
  const base = {
    sample_size: patternSummary.sample_size,
    confidence_level: patternSummary.confidence_level,
    suggested_fixes: []
  } satisfies Pick<PreSubmitPatternWarning, 'sample_size' | 'confidence_level' | 'suggested_fixes'>;

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
  const signals = collectSignals(slip);
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

  const matches: PreSubmitMatchedPattern[] = [];

  if (recurringTags.has('line_too_aggressive') && signals.aggressiveLegs.length >= 2) {
    matches.push({
      tag: 'line_too_aggressive',
      reason: `Reviewed losses repeatedly tagged aggressive lines, and this slip carries ${signals.aggressiveLegs.length} high-threshold ladder leg${signals.aggressiveLegs.length === 1 ? '' : 's'}.`
    });
  }

  if (recurringTags.has('correlated_legs') && correlatedLegCount >= 2) {
    matches.push({
      tag: 'correlated_legs',
      reason: `Reviewed losses repeatedly tagged correlated legs, and this slip stacks ${correlatedLegCount} leg${correlatedLegCount === 1 ? '' : 's'} through one player/team/game script.`
    });
  }

  if (recurringTags.has('blowout_minutes_risk') && signals.blowoutLegs.length >= 1) {
    matches.push({
      tag: 'blowout_minutes_risk',
      reason: `Reviewed losses repeatedly tagged blowout minutes risk, and this slip includes ${signals.blowoutLegs.length} over-style leg${signals.blowoutLegs.length === 1 ? '' : 's'} already carrying similar script pressure.`
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
    ...base,
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
      aggressiveLegCount: signals.aggressiveLegs.length,
      correlationLegCount: correlatedLegCount,
      blowoutLegCount: signals.blowoutLegs.length
    }),
    suggested_fixes: buildSuggestedFixes({
      slip,
      patternSummary,
      matches: matchedPatterns,
      signals
    })
  };
}
