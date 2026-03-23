import type { ConfidenceLevel, CauseTag } from '@/src/core/postmortem/attribution';
import type { PostmortemRecord } from '@/src/core/review/types';

export type LifecycleRiskLevel = 'stable' | 'watch' | 'fragile' | 'high-pressure';
export type LifecycleRiskDriver =
  | 'balanced_build'
  | 'inflated_thresholds'
  | 'volatile_secondary_stats'
  | 'correlated_stack_pressure'
  | 'late_game_dependency'
  | 'role_mismatch'
  | 'hot_hand_regression_risk'
  | 'low_evidence';

export type LifecycleRiskStage = 'before' | 'during' | 'after';

export type LifecycleRisk = {
  level: LifecycleRiskLevel;
  pressureLabel: string;
  primaryDriver: LifecycleRiskDriver;
  secondaryDriver: LifecycleRiskDriver | null;
  reliability: ConfidenceLevel;
  headline: string;
  detail: string;
  continuityTags: string[];
  carriedThrough: boolean;
  evidence: Array<{ driver: LifecycleRiskDriver; score: number; tag: string }>;
};

type DriverScoreMap = Partial<Record<LifecycleRiskDriver, number>>;

const DRIVER_PRIORITY: LifecycleRiskDriver[] = [
  'correlated_stack_pressure',
  'inflated_thresholds',
  'late_game_dependency',
  'volatile_secondary_stats',
  'role_mismatch',
  'hot_hand_regression_risk',
  'low_evidence',
  'balanced_build'
];

const DRIVER_LABELS: Record<LifecycleRiskDriver, string> = {
  balanced_build: 'Balanced build',
  inflated_thresholds: 'Inflated thresholds',
  volatile_secondary_stats: 'Volatile secondary stats',
  correlated_stack_pressure: 'Correlated stack pressure',
  late_game_dependency: 'Late-game dependency',
  role_mismatch: 'Role mismatch',
  hot_hand_regression_risk: 'Hot-hand regression risk',
  low_evidence: 'Low evidence'
};

const LEVEL_LABELS: Record<LifecycleRiskLevel, string> = {
  stable: 'Stable',
  watch: 'Watch',
  fragile: 'Fragile',
  'high-pressure': 'High pressure'
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function getSortedDrivers(scores: DriverScoreMap) {
  return Object.entries(scores)
    .filter((entry): entry is [LifecycleRiskDriver, number] => typeof entry[1] === 'number' && entry[1] > 0)
    .sort((a, b) => b[1] - a[1] || DRIVER_PRIORITY.indexOf(a[0]) - DRIVER_PRIORITY.indexOf(b[0]));
}

function levelFromScore(score: number, primary: LifecycleRiskDriver): LifecycleRiskLevel {
  if (primary === 'balanced_build' && score <= 18) return 'stable';
  if (score >= 66) return 'high-pressure';
  if (score >= 42) return 'fragile';
  if (score >= 20) return 'watch';
  return 'stable';
}

function defaultReliability(value?: ConfidenceLevel): ConfidenceLevel {
  return value ?? 'medium';
}

function headlineFor(level: LifecycleRiskLevel, stage: LifecycleRiskStage, primary: LifecycleRiskDriver, carriedThrough: boolean) {
  const driverLabel = DRIVER_LABELS[primary];
  if (primary === 'balanced_build' && level === 'stable') {
    return stage === 'after' ? 'Stable build held up.' : 'Stable build so far.';
  }
  if (stage === 'before') {
    if (level === 'high-pressure') return `${driverLabel} makes this ticket high pressure.`;
    if (level === 'fragile') return `${driverLabel} is the main fragility.`;
    return `${driverLabel} is the main watch item.`;
  }
  if (stage === 'during') {
    if (carriedThrough) return `${driverLabel} is still driving this ticket.`;
    return `${driverLabel} is setting the live pressure.`;
  }
  if (carriedThrough) return `${driverLabel} carried through at settlement.`;
  return `${driverLabel} shaped the closing review.`;
}

function detailFor(level: LifecycleRiskLevel, stage: LifecycleRiskStage, primary: LifecycleRiskDriver, secondary: LifecycleRiskDriver | null) {
  const secondaryText = secondary ? ` Secondary driver: ${DRIVER_LABELS[secondary]}.` : '';
  if (primary === 'balanced_build') {
    return stage === 'after'
      ? `The ticket stayed compact enough that no single deterministic fragility driver took over.${secondaryText}`
      : `No single deterministic fragility driver is dominating this ticket right now.${secondaryText}`;
  }

  const core: Record<LifecycleRiskDriver, string> = {
    balanced_build: 'The build is staying balanced.',
    inflated_thresholds: 'The slip depends on thresholds that are stretched relative to the rest of the build.',
    volatile_secondary_stats: 'Too much of the slip leans on rebounds/assists or other swingier support stats.',
    correlated_stack_pressure: 'Too many legs still depend on the same player, game, or script.',
    late_game_dependency: 'The ticket still needs late-game minutes, usage, or a closing run to get home.',
    role_mismatch: 'The market ask does not line up cleanly with the player role the ticket needs.',
    hot_hand_regression_risk: 'The build is still leaning on heater-style efficiency more than stable role volume.',
    low_evidence: 'The signal stays light because the support behind the warning is thin.'
  };

  const stageTail =
    stage === 'before'
      ? ' Advisory only — use it as a scan, not a block.'
      : stage === 'during'
        ? ' Watch whether the weakest leg keeps confirming that read.'
        : ' Use this as the next-build reminder, not proof of causality beyond the recorded evidence.';

  return `${core[primary]}${secondaryText}${stageTail}`;
}

export function buildLifecycleRisk(input: {
  stage: LifecycleRiskStage;
  driverScores: DriverScoreMap;
  reliability?: ConfidenceLevel;
  carriedDrivers?: LifecycleRiskDriver[];
  continuityTags?: string[];
}): LifecycleRisk {
  const sorted = getSortedDrivers(input.driverScores);
  const primaryDriver = sorted[0]?.[0] ?? 'balanced_build';
  const secondaryDriver = sorted[1]?.[0] ?? null;
  const topScore = sorted[0]?.[1] ?? 0;
  const level = levelFromScore(topScore, primaryDriver);
  const carriedThrough = Boolean(input.carriedDrivers?.includes(primaryDriver));
  const headline = headlineFor(level, input.stage, primaryDriver, carriedThrough);
  const detail = detailFor(level, input.stage, primaryDriver, secondaryDriver);
  const pressureLabel = LEVEL_LABELS[level];
  const tags = [
    ...(input.continuityTags ?? []),
    ...(carriedThrough ? ['Risk carried through'] : []),
    DRIVER_LABELS[primaryDriver],
    ...(secondaryDriver ? [DRIVER_LABELS[secondaryDriver]] : [])
  ].filter((value, index, arr) => arr.indexOf(value) === index);

  return {
    level,
    pressureLabel,
    primaryDriver,
    secondaryDriver,
    reliability: defaultReliability(input.reliability),
    headline,
    detail,
    continuityTags: tags,
    carriedThrough,
    evidence: sorted.map(([driver, score]) => ({ driver, score: clamp(score), tag: DRIVER_LABELS[driver] }))
  };
}

export function driverFromCauseTag(tag: CauseTag): LifecycleRiskDriver {
  switch (tag) {
    case 'line_too_aggressive':
      return 'inflated_thresholds';
    case 'correlated_legs':
      return 'correlated_stack_pressure';
    case 'blowout_minutes_risk':
    case 'late_game_inactivity':
    case 'injury_or_rotation_shift':
      return 'late_game_dependency';
    case 'role_mismatch':
    case 'low_usage_player':
      return 'role_mismatch';
    case 'efficiency_variance':
      return 'hot_hand_regression_risk';
    default:
      return 'low_evidence';
  }
}

export function driverFromLearningPattern(pattern?: string | null): LifecycleRiskDriver | null {
  switch (pattern) {
    case 'inflated_threshold':
      return 'inflated_thresholds';
    case 'overstacked_correlation':
      return 'correlated_stack_pressure';
    case 'fragile_late_game_dependency':
      return 'late_game_dependency';
    case 'rebound_assist_volatility':
      return 'volatile_secondary_stats';
    case 'role_mismatch':
    case 'rotation_context_miss':
    case 'single_leg_dependency':
      return 'role_mismatch';
    case 'hot_hand_regression_trap':
      return 'hot_hand_regression_risk';
    default:
      return null;
  }
}

export function derivePreSubmitLifecycleRisk(input: {
  sampleSize: number;
  confidenceLevel: ConfidenceLevel;
  matchedTags: CauseTag[];
  aggressiveLegs: number;
  correlatedLegs: number;
  blowoutLegs: number;
  volatileLegs?: number;
  learningPattern?: string | null;
}): LifecycleRisk {
  const scores: DriverScoreMap = {};
  if (input.matchedTags.includes('line_too_aggressive')) scores.inflated_thresholds = 40 + input.aggressiveLegs * 9;
  if (input.matchedTags.includes('correlated_legs')) scores.correlated_stack_pressure = 38 + input.correlatedLegs * 10;
  if (input.matchedTags.includes('blowout_minutes_risk')) scores.late_game_dependency = 34 + input.blowoutLegs * 11;
  if ((input.volatileLegs ?? 0) >= 2) scores.volatile_secondary_stats = 24 + (input.volatileLegs ?? 0) * 7;
  const learningDriver = driverFromLearningPattern(input.learningPattern);
  if (learningDriver) scores[learningDriver] = Math.max(scores[learningDriver] ?? 0, 26 + input.sampleSize * 4);
  if (input.sampleSize < 3) scores.low_evidence = 30;
  if (Object.keys(scores).length === 0) scores.balanced_build = 10;

  return buildLifecycleRisk({
    stage: 'before',
    driverScores: scores,
    reliability: input.sampleSize < 2 ? 'low' : input.confidenceLevel,
    continuityTags: input.sampleSize < 2 ? ['Thin history'] : ['Pre-submit']
  });
}

export function deriveLiveLifecycleRisk(input: {
  behindCount: number;
  criticalCount: number;
  carryingCount: number;
  sameGameStack: boolean;
  volatileLegs: number;
  minutesRiskLegs: number;
  weakestReasons?: string[];
  pregameDriver?: LifecycleRiskDriver | null;
  pregameLevel?: LifecycleRiskLevel | null;
}): LifecycleRisk {
  const scores: DriverScoreMap = {};
  if (input.sameGameStack) scores.correlated_stack_pressure = 34 + input.behindCount * 10;
  if (input.minutesRiskLegs > 0 || input.weakestReasons?.some((reason) => /late|minutes|margin/i.test(reason))) {
    scores.late_game_dependency = 36 + input.minutesRiskLegs * 12 + input.criticalCount * 8;
  }
  if (input.volatileLegs >= 2) scores.volatile_secondary_stats = 20 + input.volatileLegs * 7 + input.behindCount * 5;
  if (input.weakestReasons?.some((reason) => /ladder|distance/i.test(reason))) scores.inflated_thresholds = 30 + input.criticalCount * 10;
  if (input.pregameDriver && input.pregameDriver !== 'balanced_build') {
    scores[input.pregameDriver] = Math.max(scores[input.pregameDriver] ?? 0, (input.pregameLevel === 'high-pressure' ? 52 : input.pregameLevel === 'fragile' ? 42 : 28) + input.behindCount * 4 + input.criticalCount * 6);
  }
  if (Object.keys(scores).length === 0 && input.carryingCount > 0) scores.balanced_build = 12;

  return buildLifecycleRisk({
    stage: 'during',
    driverScores: scores,
    reliability: input.criticalCount > 0 ? 'high' : input.behindCount > 0 ? 'medium' : 'medium',
    carriedDrivers: input.pregameDriver ? [input.pregameDriver] : [],
    continuityTags: ['Live']
  });
}

export function deriveAfterLifecycleRisk(input: {
  postmortem?: PostmortemRecord | null;
  causeTags?: CauseTag[];
  confidenceLevel?: ConfidenceLevel;
  outcome?: 'won' | 'lost' | 'void' | 'mixed' | 'partial';
  pregameDriver?: LifecycleRiskDriver | null;
  liveDriver?: LifecycleRiskDriver | null;
}): LifecycleRisk {
  const scores: DriverScoreMap = {};
  const tags = input.causeTags ?? [];
  for (const tag of tags) {
    const driver = driverFromCauseTag(tag);
    scores[driver] = (scores[driver] ?? 0) + 34;
  }

  if (input.postmortem) {
    const missCount = input.postmortem.legs.filter((leg) => !leg.hit).length;
    const nearMissCount = input.postmortem.legs.filter((leg) => !leg.hit && Math.abs(leg.delta) <= 1).length;
    if (input.postmortem.legs.some((leg) => !leg.hit && ['assists', 'rebounds', 'ra'].includes(leg.statType))) {
      scores.volatile_secondary_stats = Math.max(scores.volatile_secondary_stats ?? 0, 22 + missCount * 8);
    }
    if (nearMissCount > 0) {
      scores.inflated_thresholds = Math.max(scores.inflated_thresholds ?? 0, 24 + nearMissCount * 8);
    }
    if (input.postmortem.status === 'void' || missCount === 0 && input.postmortem.legs.length > 0) {
      scores.balanced_build = 12;
    }
  }

  if (Object.keys(scores).length === 0) scores.low_evidence = input.outcome === 'void' ? 18 : 26;

  const carriedDrivers = [input.pregameDriver, input.liveDriver].filter(Boolean) as LifecycleRiskDriver[];
  return buildLifecycleRisk({
    stage: 'after',
    driverScores: scores,
    reliability: input.confidenceLevel ?? 'medium',
    carriedDrivers,
    continuityTags: ['Settled review']
  });
}
