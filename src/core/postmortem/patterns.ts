import type { ReviewPostMortemResult, ReviewProvenance } from '@/src/core/control/reviewIngestion';
import type {
  CauseTag,
  ConfidenceLevel,
  PostmortemOutcome,
  WeakestLegAttribution
} from '@/src/core/postmortem/attribution';

export type RecurringTagSummary = {
  tag: CauseTag;
  count: number;
  percentage: number;
};

export type BettorPatternExample = {
  trace_id?: string;
  slip_id?: string;
  reviewed_at: string;
  player: string | null;
  prop_type: string | null;
  tag: CauseTag;
};

export type CommonFailureMode =
  | 'insufficient_history'
  | 'aggressive_line_selection'
  | 'blowout_sensitive_scoring'
  | 'role_market_mismatch'
  | 'correlated_same_script_exposure'
  | 'high_variance_stat_chasing'
  | 'rotation_context_misses'
  | 'mixed_repeated_misses';

export type BettorMistakePatternSummary = {
  recurring_tags: RecurringTagSummary[];
  common_failure_mode: CommonFailureMode;
  sample_size: number;
  confidence_level: ConfidenceLevel;
  recommendation_summary: string;
  recent_examples: BettorPatternExample[];
};

export type ReviewedAttributionRecord = {
  trace_id?: string;
  slip_id?: string;
  reviewed_at: string;
  outcome: PostmortemOutcome;
  cause_tags: CauseTag[];
  confidence_level: ConfidenceLevel;
  weakest_leg?: WeakestLegAttribution;
  source_type: ReviewProvenance['source_type'];
  parse_status: ReviewProvenance['parse_status'];
};

const MIN_SAMPLE_SIZE = 3;
const MIN_TAG_REPEAT_COUNT = 2;
const HIGH_VARIANCE_PROP_TYPES = new Set(['threes', 'blocks', 'steals']);

const clampPercentage = (value: number): number => Number(value.toFixed(2));

const titleCase = (value: string) => value.replace(/_/g, ' ');

export function toReviewedAttributionRecord(input: {
  postmortem: ReviewPostMortemResult;
  provenance: ReviewProvenance;
  reviewed_at?: string;
}): ReviewedAttributionRecord | null {
  const attribution = input.postmortem.attribution;
  if (!attribution) return null;
  if (input.provenance.source_type === 'demo_sample') return null;
  if (input.provenance.parse_status === 'failed') return null;

  return {
    trace_id:
      attribution.trace_id ?? input.postmortem.trace_id ?? input.provenance.trace_id ?? undefined,
    slip_id:
      attribution.slip_id ?? input.postmortem.slip_id ?? input.provenance.slip_id ?? undefined,
    reviewed_at: input.reviewed_at ?? input.provenance.generated_at,
    outcome: attribution.outcome,
    cause_tags: attribution.cause_tags,
    confidence_level: attribution.confidence_level,
    weakest_leg: attribution.weakest_leg,
    source_type: input.provenance.source_type,
    parse_status: input.provenance.parse_status
  };
}

function buildRecommendation(summary: {
  sampleSize: number;
  confidenceLevel: ConfidenceLevel;
  mode: CommonFailureMode;
  topTag?: RecurringTagSummary;
}): string {
  if (summary.sampleSize === 0)
    return 'No reviewed slip history yet, so no bettor pattern summary is available.';
  if (summary.sampleSize < MIN_SAMPLE_SIZE || summary.confidenceLevel === 'low') {
    return `Limited history: pattern confidence is low across ${summary.sampleSize} reviewed slip${summary.sampleSize === 1 ? '' : 's'}.`;
  }

  switch (summary.mode) {
    case 'blowout_sensitive_scoring':
      return 'Across recent reviews, the most common misses came from aggressive scoring looks in blowout-sensitive scripts.';
    case 'aggressive_line_selection':
      return 'Across recent reviews, the main repeat issue is pushing into aggressive lines more often than the tracked outcomes support.';
    case 'role_market_mismatch':
      return "Across recent reviews, the repeat issue is leaning on markets that do not match the player's role cleanly enough.";
    case 'correlated_same_script_exposure':
      return 'Across recent reviews, the main repeat issue is stacking legs that depend on the same game script.';
    case 'high_variance_stat_chasing':
      return 'Across recent reviews, the repeat issue is concentrating too much exposure in high-variance stat types.';
    case 'rotation_context_misses':
      return 'Across recent reviews, the repeat issue is underweighting rotation or minutes changes before locking the slip.';
    case 'mixed_repeated_misses':
      return `Across recent reviews, ${summary.topTag ? titleCase(summary.topTag.tag) : 'one failure mode'} shows up most often, but the pattern is still mixed.`;
    default:
      return 'Limited history: pattern confidence is low.';
  }
}

function inferFailureMode(
  recurringTags: RecurringTagSummary[],
  records: ReviewedAttributionRecord[]
): CommonFailureMode {
  if (records.length < MIN_SAMPLE_SIZE || recurringTags.length === 0) return 'insufficient_history';

  const tagSet = new Set(recurringTags.map((item) => item.tag));
  const highVarianceCount = records.filter((record) =>
    HIGH_VARIANCE_PROP_TYPES.has(record.weakest_leg?.prop_type ?? '')
  ).length;
  const highVarianceShare = highVarianceCount / Math.max(1, records.length);

  if (tagSet.has('line_too_aggressive') && tagSet.has('blowout_minutes_risk'))
    return 'blowout_sensitive_scoring';
  if (tagSet.has('correlated_legs')) return 'correlated_same_script_exposure';
  if (tagSet.has('role_mismatch')) return 'role_market_mismatch';
  if (tagSet.has('injury_or_rotation_shift') || tagSet.has('blowout_minutes_risk'))
    return 'rotation_context_misses';
  if (highVarianceCount >= 2 && highVarianceShare >= 0.4) return 'high_variance_stat_chasing';
  if (tagSet.has('line_too_aggressive')) return 'aggressive_line_selection';
  return 'mixed_repeated_misses';
}

export function summarizeBettorMistakePatterns(
  records: ReviewedAttributionRecord[]
): BettorMistakePatternSummary {
  const eligible = [...records]
    .filter(
      (record) =>
        record.parse_status !== 'failed' &&
        record.source_type !== 'demo_sample' &&
        record.cause_tags.length > 0
    )
    .sort((a, b) => Date.parse(b.reviewed_at) - Date.parse(a.reviewed_at));

  if (eligible.length === 0) {
    return {
      recurring_tags: [],
      common_failure_mode: 'insufficient_history',
      sample_size: 0,
      confidence_level: 'low',
      recommendation_summary:
        'No reviewed slip history yet, so no bettor pattern summary is available.',
      recent_examples: []
    };
  }

  const tagCounts = new Map<CauseTag, number>();
  for (const record of eligible) {
    for (const tag of new Set(record.cause_tags)) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const recurringTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count, percentage: clampPercentage(count / eligible.length) }))
    .filter((item) => item.count >= MIN_TAG_REPEAT_COUNT)
    .sort((a, b) => b.count - a.count || b.percentage - a.percentage || a.tag.localeCompare(b.tag))
    .slice(0, 3);

  const topTag = recurringTags[0];
  let confidenceLevel: ConfidenceLevel = 'low';
  if (eligible.length >= 6 && topTag && topTag.count >= 3 && topTag.percentage >= 0.5)
    confidenceLevel = 'high';
  else if (
    eligible.length >= MIN_SAMPLE_SIZE &&
    topTag &&
    topTag.count >= MIN_TAG_REPEAT_COUNT &&
    topTag.percentage >= 0.34
  )
    confidenceLevel = 'medium';

  const commonFailureMode = inferFailureMode(recurringTags, eligible);
  const recentExamples = eligible
    .flatMap((record) => {
      const topRecordTag =
        recurringTags.find((tag) => record.cause_tags.includes(tag.tag))?.tag ??
        record.cause_tags[0];
      if (!topRecordTag) return [];
      return [
        {
          trace_id: record.trace_id,
          slip_id: record.slip_id,
          reviewed_at: record.reviewed_at,
          player: record.weakest_leg?.player ?? null,
          prop_type: record.weakest_leg?.prop_type ?? null,
          tag: topRecordTag
        } satisfies BettorPatternExample
      ];
    })
    .slice(0, 3);

  return {
    recurring_tags: recurringTags,
    common_failure_mode: commonFailureMode,
    sample_size: eligible.length,
    confidence_level: confidenceLevel,
    recommendation_summary: buildRecommendation({
      sampleSize: eligible.length,
      confidenceLevel,
      mode: commonFailureMode,
      topTag
    }),
    recent_examples: recentExamples
  };
}
