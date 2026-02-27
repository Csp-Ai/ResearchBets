import type { SlipOutcomeRecord } from '@/src/core/persistence/runtimeStore';

export interface ConfidenceBucketAccuracy {
  range: string;
  predicted: number;
  actual: number;
  count: number;
}

export interface DecisionProfile {
  user_impulse_index: number;
  over_correlation_tendency: number;
  high_fragility_frequency: number;
}

export interface CalibrationMetrics {
  take_accuracy: number;
  modify_prevented_rate: number;
  pass_skip_win_delta: number;
  weakest_leg_accuracy: number;
  verdict_accuracy_by_type: Record<'TAKE' | 'MODIFY' | 'PASS', number>;
  confidence_bucket_accuracy: ConfidenceBucketAccuracy[];
  runs_analyzed: number;
  last_updated: string | null;
  decision_profile: DecisionProfile;
}

const round = (value: number): number => Number(value.toFixed(4));

const pct = (num: number, den: number): number => {
  if (!den) return 0;
  return round(num / den);
};

const BUCKETS = Array.from({ length: 10 }, (_, idx) => ({
  min: idx * 10,
  max: idx * 10 + 9
}));

export function computeCalibrationMetricsFromOutcomes(outcomes: SlipOutcomeRecord[]): CalibrationMetrics {
  if (outcomes.length === 0) {
    return {
      take_accuracy: 0,
      modify_prevented_rate: 0,
      pass_skip_win_delta: 0,
      weakest_leg_accuracy: 0,
      verdict_accuracy_by_type: { TAKE: 0, MODIFY: 0, PASS: 0 },
      confidence_bucket_accuracy: BUCKETS.map((bucket) => ({
        range: `${bucket.min}-${bucket.max}%`,
        predicted: 0,
        actual: 0,
        count: 0
      })),
      runs_analyzed: 0,
      last_updated: null,
      decision_profile: {
        user_impulse_index: 0,
        over_correlation_tendency: 0,
        high_fragility_frequency: 0
      }
    };
  }

  const takes = outcomes.filter((item) => item.verdictPresented === 'TAKE');
  const modifies = outcomes.filter((item) => item.verdictPresented === 'MODIFY');
  const passes = outcomes.filter((item) => item.verdictPresented === 'PASS');

  const takeWins = takes.filter((item) => item.finalOutcome === 'WIN').length;
  const takeAccuracy = pct(takeWins, takes.length);

  const modifyPreventedRate = pct(
    modifies.filter((item) => item.finalOutcome !== 'WIN').length,
    modifies.length
  );

  const passLossRate = pct(
    passes.filter((item) => item.finalOutcome !== 'WIN').length,
    passes.length
  );

  const weakestLegAccuracy = pct(
    outcomes.filter((item) => item.hitWeakestLeg).length,
    outcomes.length
  );

  const verdictAccuracyByType = {
    TAKE: pct(takes.filter((item) => item.verdictCorrect).length, takes.length),
    MODIFY: pct(modifies.filter((item) => item.verdictCorrect).length, modifies.length),
    PASS: pct(passes.filter((item) => item.verdictCorrect).length, passes.length)
  };

  const confidenceBucketAccuracy = BUCKETS.map((bucket) => {
    const inBucket = outcomes.filter((item) => {
      const score = Math.max(0, Math.min(99, Math.floor(item.confidenceScore)));
      return score >= bucket.min && score <= bucket.max;
    });
    const predicted = inBucket.length
      ? inBucket.reduce((sum, item) => sum + item.confidenceScore / 100, 0) / inBucket.length
      : 0;
    const actual = inBucket.length
      ? inBucket.filter((item) => item.finalOutcome === 'WIN').length / inBucket.length
      : 0;
    return {
      range: `${bucket.min}-${bucket.max}%`,
      predicted: round(predicted),
      actual: round(actual),
      count: inBucket.length
    };
  });

  const decisionProfile: DecisionProfile = {
    user_impulse_index: pct(
      outcomes.filter((item) => item.verdictPresented === 'TAKE' && item.fragilityScore >= 60).length,
      outcomes.length
    ),
    over_correlation_tendency: pct(
      outcomes.filter((item) => item.correlationScore >= 55).length,
      outcomes.length
    ),
    high_fragility_frequency: pct(
      outcomes.filter((item) => item.fragilityScore >= 60).length,
      outcomes.length
    )
  };

  return {
    take_accuracy: takeAccuracy,
    modify_prevented_rate: modifyPreventedRate,
    pass_skip_win_delta: round(passLossRate - takeAccuracy),
    weakest_leg_accuracy: weakestLegAccuracy,
    verdict_accuracy_by_type: verdictAccuracyByType,
    confidence_bucket_accuracy: confidenceBucketAccuracy,
    runs_analyzed: outcomes.length,
    last_updated: outcomes[0]?.createdAt ?? null,
    decision_profile: decisionProfile
  };
}
