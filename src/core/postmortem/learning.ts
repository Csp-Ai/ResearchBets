import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import type { ConfidenceLevel } from '@/src/core/postmortem/attribution';
import type { ReviewedAttributionRecord } from '@/src/core/postmortem/patterns';
import type { PostmortemRecord } from '@/src/core/review/types';

export type TicketOutcomeCategory = 'win' | 'loss' | 'mixed' | 'void';

export type SettledLearningFailurePattern =
  | 'inflated_threshold'
  | 'role_mismatch'
  | 'overstacked_correlation'
  | 'fragile_late_game_dependency'
  | 'rebound_assist_volatility'
  | 'hot_hand_regression_trap'
  | 'rotation_context_miss'
  | 'single_leg_dependency';

export type SettledLearningSuccessPattern =
  | 'balanced_thresholds'
  | 'independent_legs'
  | 'role_aligned_core'
  | 'support_stat_balance'
  | 'late_game_resilience';

export type LearningMatchProfile = {
  statFamily: 'primary_scoring' | 'secondary_volatility' | 'mixed';
  aggressiveThresholds: boolean;
  correlatedStructure: boolean;
  volatileSecondaryStats: boolean;
  lateGameDependency: boolean;
};

export type SettledLearningArtifact = {
  artifact_id: string;
  source: 'settled_postmortem' | 'reviewed_postmortem';
  ticket_id?: string;
  trace_id?: string;
  slip_id?: string;
  created_at: string;
  outcome_category: TicketOutcomeCategory;
  strongest_winning_pattern: SettledLearningSuccessPattern | null;
  breaking_pattern: SettledLearningFailurePattern | null;
  failure_pattern: SettledLearningFailurePattern | null;
  takeaway: string;
  confidence_band: ConfidenceLevel;
  decisive_leg_count: number;
  match_profile: LearningMatchProfile;
};

export type DraftLearningAdvisory = {
  sample_size: number;
  confidence_band: ConfidenceLevel;
  strongest_repeated_success: string;
  repeated_break_pattern: string;
  watch_note: string;
  provenance: Array<
    Pick<
      SettledLearningArtifact,
      'artifact_id' | 'ticket_id' | 'trace_id' | 'slip_id' | 'created_at' | 'outcome_category'
    >
  >;
};

const SECONDARY_MARKETS = new Set(['rebounds', 'assists', 'ra']);
const VOLATILE_MARKETS = new Set(['rebounds', 'assists', 'steals', 'blocks', 'ra']);
const PRIMARY_MARKETS = new Set(['points', 'threes', 'pra']);
const AGGRESSIVE_MISS_TAGS = new Set(['bust_by_one', 'ladder_miss', 'line_too_high']);
const LATE_GAME_TAGS = new Set(['late_fade', 'late_whistle_loss', 'minutes_dip', 'blowout_watch']);
const CORRELATION_TAGS = new Set(['same_game_stack', 'same_player_stack']);
const REGRESSION_TAGS = new Set(['shooting_regression', 'heater_cooloff']);

const normalizeText = (value?: string | null): string => value?.trim().toLowerCase() ?? '';

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

function parseLine(line: string): number | null {
  const value = Number(line);
  return Number.isFinite(value) ? value : null;
}

function inferOutcomeCategory(record: PostmortemRecord): TicketOutcomeCategory {
  if (record.status === 'void') return 'void';
  const hitCount = record.legs.filter((leg) => leg.hit).length;
  const missCount = record.legs.filter((leg) => !leg.hit).length;
  if (missCount === 0) return 'win';
  if (hitCount === 0) return 'loss';
  return 'mixed';
}

function inferMatchProfileFromLegs(
  legs: Array<{
    statType?: string | null;
    target?: number | null;
    player?: string | null;
    game?: string | null;
    missTags?: string[];
    lessonHint?: string | null;
  }>
): LearningMatchProfile {
  const markets = legs.map((leg) => normalizeText(leg.statType));
  const primaryCount = markets.filter((market) => PRIMARY_MARKETS.has(market)).length;
  const secondaryCount = markets.filter((market) => SECONDARY_MARKETS.has(market)).length;
  const uniquePlayers = new Set(legs.map((leg) => normalizeText(leg.player)).filter(Boolean)).size;
  const uniqueGames = new Set(legs.map((leg) => normalizeText(leg.game)).filter(Boolean)).size;
  const aggressiveThresholds = legs.some((leg) => {
    const market = normalizeText(leg.statType);
    const target = typeof leg.target === 'number' ? leg.target : null;
    if (target === null) return false;
    if (market === 'points') return target >= 28.5;
    if (market === 'threes') return target >= 4.5;
    if (market === 'assists') return target >= 8.5;
    if (market === 'rebounds') return target >= 11.5;
    return false;
  });
  const lateGameDependency = legs.some((leg) => {
    const joined = `${(leg.missTags ?? []).join(' ')} ${leg.lessonHint ?? ''}`.toLowerCase();
    return /late|fourth|minutes|close|blowout/.test(joined);
  });

  return {
    statFamily:
      primaryCount > 0 && secondaryCount === 0
        ? 'primary_scoring'
        : secondaryCount > 0 && primaryCount === 0
          ? 'secondary_volatility'
          : 'mixed',
    aggressiveThresholds,
    correlatedStructure:
      uniquePlayers < legs.length || (uniqueGames > 0 && uniqueGames < legs.length),
    volatileSecondaryStats: markets.filter((market) => VOLATILE_MARKETS.has(market)).length >= 2,
    lateGameDependency
  };
}

function summarizeSuccessPattern(record: PostmortemRecord): SettledLearningSuccessPattern | null {
  const hitLegs = record.legs.filter((leg) => leg.hit);
  if (hitLegs.length === 0) return null;
  const profile = inferMatchProfileFromLegs(
    hitLegs.map((leg) => ({ statType: leg.statType, target: leg.target, player: leg.player }))
  );
  if (!profile.aggressiveThresholds && !profile.correlatedStructure) return 'balanced_thresholds';
  if (!profile.correlatedStructure) return 'independent_legs';
  if (profile.volatileSecondaryStats) return 'support_stat_balance';
  if (!profile.lateGameDependency) return 'late_game_resilience';
  return 'role_aligned_core';
}

function inferFailurePattern(record: PostmortemRecord): SettledLearningFailurePattern | null {
  const missedLegs = record.legs.filter((leg) => !leg.hit);
  if (missedLegs.length === 0) return null;
  const repeatedTags = missedLegs.flatMap((leg) => leg.missTags.map((tag) => normalizeText(tag)));
  const missProfile = inferMatchProfileFromLegs(
    missedLegs.map((leg) => ({
      statType: leg.statType,
      target: leg.target,
      player: leg.player,
      missTags: leg.missTags,
      lessonHint: leg.lessonHint
    }))
  );
  const repeatedSet = new Set(repeatedTags);

  if (missProfile.correlatedStructure || repeatedTags.some((tag) => CORRELATION_TAGS.has(tag)))
    return 'overstacked_correlation';
  if (missProfile.lateGameDependency || repeatedTags.some((tag) => LATE_GAME_TAGS.has(tag)))
    return 'fragile_late_game_dependency';
  if (missProfile.volatileSecondaryStats) return 'rebound_assist_volatility';
  if (missedLegs.length === 1) return 'single_leg_dependency';
  if (repeatedTags.some((tag) => AGGRESSIVE_MISS_TAGS.has(tag)) || missProfile.aggressiveThresholds)
    return 'inflated_threshold';
  if (repeatedTags.some((tag) => REGRESSION_TAGS.has(tag))) return 'hot_hand_regression_trap';
  if (repeatedSet.has('role_mismatch')) return 'role_mismatch';
  if (repeatedSet.has('rotation_watch') || repeatedSet.has('minutes_dip'))
    return 'rotation_context_miss';
  return 'inflated_threshold';
}

function confidenceFromRecord(
  record: PostmortemRecord,
  outcome: TicketOutcomeCategory
): ConfidenceLevel {
  const totalLegs = record.legs.length;
  const decisiveLegCount = record.legs.filter((leg) =>
    outcome === 'win' ? leg.hit : !leg.hit
  ).length;
  if (outcome === 'void') return 'low';
  if (totalLegs <= 1) return 'low';
  if (record.coverage.level !== 'full') return decisiveLegCount >= 2 ? 'medium' : 'low';
  if (decisiveLegCount >= 2 && totalLegs >= 3) return 'high';
  return 'medium';
}

function takeawayForArtifact(
  artifact: Pick<
    SettledLearningArtifact,
    'outcome_category' | 'strongest_winning_pattern' | 'breaking_pattern' | 'confidence_band'
  >
): string {
  if (artifact.outcome_category === 'win') {
    if (artifact.strongest_winning_pattern === 'balanced_thresholds')
      return 'Wins held when the slip stayed compact and thresholds stayed reasonable.';
    if (artifact.strongest_winning_pattern === 'independent_legs')
      return 'Wins held best when legs were spread across independent scripts.';
    if (artifact.strongest_winning_pattern === 'support_stat_balance')
      return 'Support-stat balance held up better than pure scoring ladders.';
    return 'Winning tickets stayed role-aligned and avoided forcing one fragile script.';
  }

  switch (artifact.breaking_pattern) {
    case 'inflated_threshold':
      return 'Losses broke when one threshold was stretched further than the ticket needed.';
    case 'overstacked_correlation':
      return 'Losses repeated when too much of the ticket depended on one script.';
    case 'fragile_late_game_dependency':
      return 'Losses repeated when the slip still needed late-game minutes or closing usage.';
    case 'rebound_assist_volatility':
      return 'Losses repeated when rebounds/assists carried too much of the slip variance.';
    case 'hot_hand_regression_trap':
      return 'Losses repeated when the ticket chased a heater instead of the steadier role.';
    case 'single_leg_dependency':
      return 'One miss decided too much of the ticket, so the structure stayed fragile.';
    case 'role_mismatch':
      return "Losses repeated when the market didn\'t line up cleanly with the player's role.";
    default:
      return artifact.confidence_band === 'low'
        ? 'The settled result is preserved, but the lesson stays light because the evidence is thin.'
        : 'The settled result points to one repeatable pressure point before the next build.';
  }
}

export function extractLearningArtifactFromPostmortem(
  record: PostmortemRecord
): SettledLearningArtifact {
  const outcome_category = inferOutcomeCategory(record);
  const strongest_winning_pattern = summarizeSuccessPattern(record);
  const breaking_pattern = inferFailurePattern(record);
  const decisive_leg_count = record.legs.filter((leg) =>
    outcome_category === 'win' ? leg.hit : !leg.hit
  ).length;
  const confidence_band = confidenceFromRecord(record, outcome_category);

  return {
    artifact_id: `postmortem:${record.ticketId}:${record.settledAt}`,
    source: 'settled_postmortem',
    ticket_id: record.ticketId,
    trace_id: record.trace_id,
    slip_id: record.slip_id,
    created_at: record.settledAt,
    outcome_category,
    strongest_winning_pattern,
    breaking_pattern,
    failure_pattern: breaking_pattern,
    takeaway: takeawayForArtifact({
      outcome_category,
      strongest_winning_pattern,
      breaking_pattern,
      confidence_band
    }),
    confidence_band,
    decisive_leg_count,
    match_profile: inferMatchProfileFromLegs(
      record.legs.map((leg) => ({
        statType: leg.statType,
        target: leg.target,
        player: leg.player,
        missTags: leg.missTags,
        lessonHint: leg.lessonHint
      }))
    )
  };
}

function mapReviewedRecordFailure(
  record: ReviewedAttributionRecord
): SettledLearningFailurePattern | null {
  if (record.outcome === 'win' || record.outcome === 'push') return null;
  if (record.cause_tags.includes('correlated_legs')) return 'overstacked_correlation';
  if (record.cause_tags.includes('late_game_inactivity')) return 'fragile_late_game_dependency';
  if (record.cause_tags.includes('role_mismatch')) return 'role_mismatch';
  if (record.cause_tags.includes('line_too_aggressive')) return 'inflated_threshold';
  if (
    record.weakest_leg?.prop_type &&
    ['rebounds', 'assists', 'ra'].includes(normalizeText(record.weakest_leg.prop_type))
  )
    return 'rebound_assist_volatility';
  if (record.cause_tags.includes('efficiency_variance')) return 'hot_hand_regression_trap';
  if (record.cause_tags.includes('injury_or_rotation_shift')) return 'rotation_context_miss';
  return 'single_leg_dependency';
}

export function extractLearningArtifactFromReviewedRecord(
  record: ReviewedAttributionRecord
): SettledLearningArtifact {
  const failure_pattern = mapReviewedRecordFailure(record);
  const outcome_category: TicketOutcomeCategory =
    record.outcome === 'win'
      ? 'win'
      : record.outcome === 'push'
        ? 'void'
        : record.outcome === 'partial'
          ? 'mixed'
          : 'loss';
  const strongest_winning_pattern: SettledLearningSuccessPattern | null =
    outcome_category === 'win'
      ? record.cause_tags.includes('correlated_legs')
        ? 'role_aligned_core'
        : 'balanced_thresholds'
      : null;
  const statType = normalizeText(record.weakest_leg?.prop_type);
  const match_profile: LearningMatchProfile = {
    statFamily: PRIMARY_MARKETS.has(statType)
      ? 'primary_scoring'
      : SECONDARY_MARKETS.has(statType)
        ? 'secondary_volatility'
        : 'mixed',
    aggressiveThresholds: record.cause_tags.includes('line_too_aggressive'),
    correlatedStructure: record.cause_tags.includes('correlated_legs'),
    volatileSecondaryStats: SECONDARY_MARKETS.has(statType),
    lateGameDependency: record.cause_tags.includes('late_game_inactivity')
  };

  return {
    artifact_id: `reviewed:${record.trace_id ?? 'unknown'}:${record.reviewed_at}`,
    source: 'reviewed_postmortem',
    trace_id: record.trace_id,
    slip_id: record.slip_id,
    created_at: record.reviewed_at,
    outcome_category,
    strongest_winning_pattern,
    breaking_pattern: failure_pattern,
    failure_pattern,
    takeaway: takeawayForArtifact({
      outcome_category,
      strongest_winning_pattern,
      breaking_pattern: failure_pattern,
      confidence_band: record.confidence_level
    }),
    confidence_band: record.confidence_level,
    decisive_leg_count: 1,
    match_profile
  };
}

function profilesMatch(profile: LearningMatchProfile, draft: LearningMatchProfile): boolean {
  let score = 0;
  if (
    profile.statFamily === draft.statFamily ||
    profile.statFamily === 'mixed' ||
    draft.statFamily === 'mixed'
  )
    score += 1;
  if (profile.aggressiveThresholds === draft.aggressiveThresholds) score += 1;
  if (profile.correlatedStructure === draft.correlatedStructure) score += 1;
  if (profile.volatileSecondaryStats === draft.volatileSecondaryStats) score += 1;
  if (profile.lateGameDependency === draft.lateGameDependency) score += 1;
  return score >= 3;
}

export function inferDraftLearningProfile(slip: SlipBuilderLeg[]): LearningMatchProfile {
  const markets = slip.map((leg) => normalizeText(leg.marketType));
  const primaryCount = markets.filter((market) => PRIMARY_MARKETS.has(market)).length;
  const secondaryCount = markets.filter((market) => SECONDARY_MARKETS.has(market)).length;
  return {
    statFamily:
      primaryCount > 0 && secondaryCount === 0
        ? 'primary_scoring'
        : secondaryCount > 0 && primaryCount === 0
          ? 'secondary_volatility'
          : 'mixed',
    aggressiveThresholds: slip.some((leg) => {
      const line = parseLine(leg.line);
      if (line === null) return false;
      if (leg.marketType === 'points') return line >= 28.5;
      if (leg.marketType === 'threes') return line >= 4.5;
      if (leg.marketType === 'assists') return line >= 8.5;
      if (leg.marketType === 'rebounds') return line >= 11.5;
      return false;
    }),
    correlatedStructure:
      new Set(slip.map((leg) => normalizeText(leg.player)).filter(Boolean)).size < slip.length ||
      new Set(slip.map((leg) => normalizeText(leg.game)).filter(Boolean)).size < slip.length,
    volatileSecondaryStats: markets.filter((market) => VOLATILE_MARKETS.has(market)).length >= 2,
    lateGameDependency: slip.some((leg) =>
      /blowout|minutes|late|close|closer/.test(
        `${leg.deadLegRisk ?? ''} ${(leg.deadLegReasons ?? []).join(' ')}`.toLowerCase()
      )
    )
  };
}

function confidenceFromArtifacts(sampleSize: number, lowConfidenceCount: number): ConfidenceLevel {
  if (sampleSize >= 4 && lowConfidenceCount <= 1) return 'high';
  if (sampleSize >= 2 && lowConfidenceCount < sampleSize) return 'medium';
  return 'low';
}

function describeSuccessPattern(pattern: SettledLearningSuccessPattern): string {
  switch (pattern) {
    case 'balanced_thresholds':
      return 'Similar wins stayed compact and kept thresholds in a normal range.';
    case 'independent_legs':
      return 'Similar wins spread risk across separate players or game scripts.';
    case 'support_stat_balance':
      return 'Similar wins mixed in support stats instead of leaning only on scoring ladders.';
    case 'late_game_resilience':
      return 'Similar wins did not need a perfect late-game script to get home.';
    default:
      return 'Similar wins stayed aligned with stable roles.';
  }
}

function describeBreakPattern(pattern: SettledLearningFailurePattern): string {
  switch (pattern) {
    case 'inflated_threshold':
      return 'The repeated break pattern is inflated thresholds.';
    case 'overstacked_correlation':
      return 'The repeated break pattern is overstacked same-script correlation.';
    case 'fragile_late_game_dependency':
      return 'The repeated break pattern is a late-game dependency that needs too much to stay live.';
    case 'rebound_assist_volatility':
      return 'The repeated break pattern is rebound/assist volatility carrying too much of the slip.';
    case 'hot_hand_regression_trap':
      return 'The repeated break pattern is hot-hand chasing instead of the steadier role.';
    case 'role_mismatch':
      return 'The repeated break pattern is a market-role mismatch.';
    case 'single_leg_dependency':
      return 'The repeated break pattern is one leg deciding too much of the ticket.';
    default:
      return 'The repeated break pattern is a rotation-context miss.';
  }
}

export function buildDraftLearningAdvisory(
  artifacts: SettledLearningArtifact[],
  slip: SlipBuilderLeg[]
): DraftLearningAdvisory | null {
  if (slip.length === 0) return null;
  const draftProfile = inferDraftLearningProfile(slip);
  const similar = artifacts
    .filter((artifact) => profilesMatch(artifact.match_profile, draftProfile))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  if (similar.length < 2) return null;

  const nonVoid = similar.filter((artifact) => artifact.outcome_category !== 'void');
  if (nonVoid.length < 2) return null;

  const successCounts = new Map<SettledLearningSuccessPattern, number>();
  const breakCounts = new Map<SettledLearningFailurePattern, number>();

  for (const artifact of nonVoid) {
    if (artifact.strongest_winning_pattern) {
      successCounts.set(
        artifact.strongest_winning_pattern,
        (successCounts.get(artifact.strongest_winning_pattern) ?? 0) + 1
      );
    }
    if (artifact.breaking_pattern) {
      breakCounts.set(
        artifact.breaking_pattern,
        (breakCounts.get(artifact.breaking_pattern) ?? 0) + 1
      );
    }
  }

  const topSuccess = [...successCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topBreak = [...breakCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!topSuccess && !topBreak) return null;

  const lowConfidenceCount = similar.filter(
    (artifact) => artifact.confidence_band === 'low'
  ).length;
  const confidence_band = confidenceFromArtifacts(nonVoid.length, lowConfidenceCount);
  if (confidence_band === 'low' && nonVoid.length < 3) return null;

  const strongest_repeated_success = topSuccess
    ? describeSuccessPattern(topSuccess[0])
    : 'No repeated win pattern is strong enough to carry forward yet.';
  const repeated_break_pattern = topBreak
    ? describeBreakPattern(topBreak[0])
    : 'No repeated break pattern is strong enough to warn on yet.';

  let watch_note = topBreak
    ? `${describeBreakPattern(topBreak[0])} Check that before you submit.`
    : 'Keep the same compact construction pattern before submitting.';

  if (topBreak?.[0] === 'inflated_threshold') {
    watch_note =
      'Watch the longest line before you submit; similar settled losses usually broke there first.';
  } else if (topBreak?.[0] === 'overstacked_correlation') {
    watch_note =
      'Watch same-game stacking before you submit; similar settled losses leaned too hard on one script.';
  } else if (topBreak?.[0] === 'rebound_assist_volatility') {
    watch_note = 'Watch how much of this draft depends on rebounds/assists before you submit.';
  } else if (topBreak?.[0] === 'fragile_late_game_dependency') {
    watch_note =
      'Watch late-game dependency before you submit; similar settled losses still needed too much closing run.';
  }

  return {
    sample_size: nonVoid.length,
    confidence_band,
    strongest_repeated_success,
    repeated_break_pattern,
    watch_note,
    provenance: similar.slice(0, 3).map((artifact) => ({
      artifact_id: artifact.artifact_id,
      ticket_id: artifact.ticket_id,
      trace_id: artifact.trace_id,
      slip_id: artifact.slip_id,
      created_at: artifact.created_at,
      outcome_category: artifact.outcome_category
    }))
  };
}

export { titleCase };
