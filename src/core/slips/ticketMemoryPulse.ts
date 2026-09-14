import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import type { DraftLearningAdvisory } from '@/src/core/postmortem/learning';
import type { BettorMistakePatternSummary } from '@/src/core/postmortem/patterns';
import { classifyConstructionLeg } from '@/src/core/slips/constructionIntelligence';
import {
  buildPreSubmitPatternWarning,
  type PreSubmitPatternWarning,
} from '@/src/core/slips/preSubmitPatternWarning';

export type TicketMemoryPulseLevel = 'high' | 'medium' | 'low' | 'clear' | 'learning';

export type TicketMemoryMatch = {
  key: string;
  label: string;
  reason: string;
  affected_leg_ids: string[];
};

export type TicketMemoryFix = {
  title: string;
  action: string;
  affected_leg_ids: string[];
};

export type TicketMemoryPulse = {
  level: TicketMemoryPulseLevel;
  headline: string;
  summary: string;
  sample_size: number;
  confidence: 'high' | 'medium' | 'low';
  matches: TicketMemoryMatch[];
  fixes: TicketMemoryFix[];
  affected_leg_ids: string[];
  base_warning: PreSubmitPatternWarning;
};

const NFL_MARKETS = new Set<SlipBuilderLeg['marketType']>([
  'passing_yards',
  'passing_tds',
  'rushing_yards',
  'receiving_yards',
  'receptions',
  'carries',
  'anytime_td',
]);

const SCORING_EVENT_MARKETS = new Set<SlipBuilderLeg['marketType']>([
  'passing_tds',
  'anytime_td',
]);

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const isNflLeg = (leg: SlipBuilderLeg) => NFL_MARKETS.has(leg.marketType);

const isAggressiveNflThreshold = (leg: SlipBuilderLeg): boolean =>
  isNflLeg(leg) && classifyConstructionLeg(leg).tier === 'pushed';

const unique = <T,>(items: T[]) => Array.from(new Set(items));

const correlatedGroups = (slip: SlipBuilderLeg[]): SlipBuilderLeg[][] => {
  const byGame = new Map<string, SlipBuilderLeg[]>();
  const byPlayer = new Map<string, SlipBuilderLeg[]>();

  for (const leg of slip) {
    const game = normalize(leg.game);
    const player = normalize(leg.player);
    if (game) byGame.set(game, [...(byGame.get(game) ?? []), leg]);
    if (player) byPlayer.set(player, [...(byPlayer.get(player) ?? []), leg]);
  }

  return [...byGame.values(), ...byPlayer.values()]
    .filter((group) => group.length >= 2)
    .sort((a, b) => b.length - a.length);
};

const levelFromBase = (warning: PreSubmitPatternWarning): TicketMemoryPulseLevel => {
  if (warning.warning_level === 'high') return 'high';
  if (warning.warning_level === 'medium') return 'medium';
  if (warning.warning_level === 'low') return 'low';
  return 'clear';
};

const headlineFor = (level: TicketMemoryPulseLevel, matchCount: number) => {
  if (level === 'learning') return 'Memory is learning your betting patterns.';
  if (level === 'clear') return 'No familiar failure pattern is firing.';
  if (level === 'high') return 'You’ve built this failure shape before.';
  if (matchCount > 1) return 'This ticket resembles multiple past pressure patterns.';
  return 'This ticket resembles a past pressure pattern.';
};

const pricedStepDownAction = (leg: SlipBuilderLeg): string | null => {
  const lower = leg.adjacentAlt;
  if (!lower) return null;

  const construction = classifyConstructionLeg(leg);
  const currentProbability = leg.marketImpliedProb ?? construction.impliedProbability;
  const probabilityGain = currentProbability === null
    ? null
    : Math.max(0, lower.marketImpliedProb - currentProbability);
  const gainCopy = probabilityGain === null
    ? ''
    : `, improving sportsbook-price implied support by +${Math.round(probabilityGain * 100)} pts`;

  return `Keep the ${leg.player} read, but move from ${leg.line} to the next lower posted tier (${lower.line} at ${lower.bestPrice})${gainCopy}. That probability change comes from sportsbook pricing, not ResearchBets model confidence.`;
};

const structuralStepDownAction = (leg: SlipBuilderLeg): string => {
  const classified = classifyConstructionLeg(leg);
  if (classified.suggestedTarget) {
    return `Keep the ${leg.player} read, but reduce the ask toward ${classified.suggestedTarget} before adding more payout elsewhere. No adjacent live price is attached, so ResearchBets is not inventing a Threshold Tax.`;
  }
  return `Keep the ${leg.player} read, but lower this pushed threshold before adding more payout elsewhere. No adjacent live price is attached, so ResearchBets is not inventing a Threshold Tax.`;
};

export function deriveTicketMemoryPulse(input: {
  slip: SlipBuilderLeg[];
  patternSummary: BettorMistakePatternSummary;
  learningAdvisory?: DraftLearningAdvisory | null;
}): TicketMemoryPulse {
  const { slip, patternSummary, learningAdvisory } = input;
  const baseWarning = buildPreSubmitPatternWarning({
    slip,
    patternSummary,
    learningAdvisory,
  });

  const matches: TicketMemoryMatch[] = baseWarning.matched_patterns.map((pattern) => ({
    key: pattern.tag,
    label: pattern.tag.replace(/_/g, ' '),
    reason: pattern.reason,
    affected_leg_ids: baseWarning.suggested_fixes
      .filter((fix) =>
        pattern.tag === 'correlated_legs'
          ? fix.fix_type === 'reduce_correlation'
          : pattern.tag === 'line_too_aggressive'
            ? fix.fix_type === 'lower_threshold' || fix.fix_type === 'trim_leg_count'
            : pattern.tag === 'blowout_minutes_risk'
              ? fix.fix_type === 'reduce_blowout_exposure'
              : false,
      )
      .flatMap((fix) => fix.affected_legs),
  }));

  const fixes: TicketMemoryFix[] = baseWarning.suggested_fixes.map((fix) => ({
    title: fix.title,
    action: fix.suggested_action,
    affected_leg_ids: fix.affected_legs,
  }));

  const recurring = new Set(patternSummary.recurring_tags.map((item) => item.tag));
  const nflLegs = slip.filter(isNflLeg);
  const aggressiveNfl = nflLegs.filter(isAggressiveNflThreshold);
  const scoringEvents = nflLegs.filter((leg) => SCORING_EVENT_MARKETS.has(leg.marketType));
  const topCorrelationGroup = correlatedGroups(nflLegs)[0] ?? [];

  const learningText = normalize(learningAdvisory?.repeated_break_pattern);
  const historySupportsAggressive =
    recurring.has('line_too_aggressive') || learningText.includes('inflated threshold');
  const historySupportsCorrelation =
    recurring.has('correlated_legs') || learningText.includes('same-game') || learningText.includes('correlation');
  const historySupportsVariance =
    recurring.has('efficiency_variance') || learningText.includes('regression') || learningText.includes('variance');

  if (historySupportsAggressive && aggressiveNfl.length > 0 && !matches.some((item) => item.key === 'nfl_aggressive_threshold')) {
    const ids = aggressiveNfl.map((leg) => leg.id);
    const firstAggressive = aggressiveNfl[0];
    const firstClassification = firstAggressive ? classifyConstructionLeg(firstAggressive) : null;
    matches.push({
      key: 'nfl_aggressive_threshold',
      label: 'inflated NFL threshold',
      reason: `Your reviewed history has already flagged stretched thresholds, and ${aggressiveNfl.length} NFL leg${aggressiveNfl.length === 1 ? '' : 's'} on this ticket ${aggressiveNfl.length === 1 ? 'is' : 'are'} classified as pushed by the same construction engine powering Push Budget.`,
      affected_leg_ids: ids,
    });
    if (firstAggressive) {
      fixes.push({
        title: firstAggressive.adjacentAlt ? 'Price the safer version' : 'Step down one NFL threshold',
        action: pricedStepDownAction(firstAggressive) ?? structuralStepDownAction(firstAggressive),
        affected_leg_ids: [firstAggressive.id],
      });
    } else if (firstClassification?.suggestedTarget) {
      fixes.push({
        title: 'Step down one NFL threshold',
        action: `Keep the player read, but reduce the ask toward ${firstClassification.suggestedTarget}.`,
        affected_leg_ids: ids.slice(0, 1),
      });
    }
  }

  if (historySupportsCorrelation && topCorrelationGroup.length >= 2 && !matches.some((item) => item.key === 'correlated_legs')) {
    const ids = topCorrelationGroup.map((leg) => leg.id);
    matches.push({
      key: 'nfl_same_script',
      label: 'same-script exposure',
      reason: `Your reviewed history has flagged correlated stacks, and ${topCorrelationGroup.length} current NFL legs depend on the same player or game script.`,
      affected_leg_ids: ids,
    });
    fixes.push({
      title: 'Break one shared game script',
      action: 'Keep the strongest angle from this game and move one dependent leg to a different matchup or role.',
      affected_leg_ids: ids.slice(-2),
    });
  }

  if (historySupportsVariance && scoringEvents.length > 0) {
    const ids = scoringEvents.map((leg) => leg.id);
    matches.push({
      key: 'nfl_binary_scoring',
      label: 'binary scoring dependency',
      reason: `Past reviews show variance pressure, and this ticket includes ${scoringEvents.length} touchdown-dependent leg${scoringEvents.length === 1 ? '' : 's'} that can fail even when the player read is directionally right.`,
      affected_leg_ids: ids,
    });
    fixes.push({
      title: 'Prefer volume over a scoring event',
      action: 'If the board supports it, replace one touchdown-dependent leg with a lower receiving, rushing, passing, target, or carry threshold.',
      affected_leg_ids: ids.slice(0, 1),
    });
  }

  const dedupedMatches = matches.filter(
    (match, index, all) => all.findIndex((candidate) => candidate.key === match.key) === index,
  ).slice(0, 3);
  const dedupedFixes = fixes.filter(
    (fix, index, all) =>
      all.findIndex((candidate) => candidate.title === fix.title) === index,
  ).slice(0, 3);
  const affected = unique(dedupedMatches.flatMap((match) => match.affected_leg_ids));

  let level = levelFromBase(baseWarning);
  if (patternSummary.sample_size === 0 && !learningAdvisory) level = 'learning';
  else if (dedupedMatches.length >= 2 && patternSummary.confidence_level === 'high') level = 'high';
  else if (dedupedMatches.length >= 1 && level === 'clear') {
    level = patternSummary.confidence_level === 'low' ? 'low' : 'medium';
  }

  const summary = dedupedMatches[0]?.reason
    ?? learningAdvisory?.watch_note
    ?? baseWarning.recommendation_summary;

  return {
    level,
    headline: headlineFor(level, dedupedMatches.length),
    summary,
    sample_size: Math.max(patternSummary.sample_size, learningAdvisory?.sample_size ?? 0),
    confidence: learningAdvisory?.confidence_band ?? patternSummary.confidence_level,
    matches: dedupedMatches,
    fixes: dedupedFixes,
    affected_leg_ids: affected,
    base_warning: baseWarning,
  };
}
