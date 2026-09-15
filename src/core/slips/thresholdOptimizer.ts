export type ThresholdAlternative = {
  line: number;
  bestPrice: string;
  consensusPrice: string;
  marketImpliedProb: number;
  sourceCount?: number;
};

export type ThresholdMove = {
  direction: 'down' | 'up';
  targetLine: number;
  lineDelta: number;
  targetProbability: number;
  probabilityDelta: number;
  bestPrice: string;
  consensusPrice: string;
  sourceCount: number | null;
};

export type ThresholdOptimizationDecision = 'step_down' | 'hold' | 'step_up';

export type ThresholdOptimization = {
  decision: ThresholdOptimizationDecision;
  reason: string;
  stepDown: ThresholdMove | null;
  stepUp: ThresholdMove | null;
};

export type ThresholdOptimizationInput = {
  currentLine: number | null;
  currentProbability: number | null;
  currentTier: 'floor' | 'core' | 'pushed';
  recentFormStatus?: 'support' | 'mixed' | 'tension' | null;
  lower?: ThresholdAlternative | null;
  higher?: ThresholdAlternative | null;
  allowEscalation?: boolean;
};

const MIN_STEP_DOWN_GAIN = 0.04;
const MAX_EFFICIENT_STEP_UP_COST = 0.07;
const MIN_ESCALATED_PROBABILITY = 0.60;

const finiteProbability = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1;

const buildStepDown = (
  currentLine: number | null,
  currentProbability: number | null,
  lower?: ThresholdAlternative | null,
): ThresholdMove | null => {
  if (currentLine === null || !finiteProbability(currentProbability) || !lower) return null;
  if (!finiteProbability(lower.marketImpliedProb) || lower.line >= currentLine) return null;
  const probabilityDelta = lower.marketImpliedProb - currentProbability;
  if (probabilityDelta <= 0) return null;

  return {
    direction: 'down',
    targetLine: lower.line,
    lineDelta: currentLine - lower.line,
    targetProbability: lower.marketImpliedProb,
    probabilityDelta,
    bestPrice: lower.bestPrice,
    consensusPrice: lower.consensusPrice,
    sourceCount: lower.sourceCount ?? null,
  };
};

const buildStepUp = (
  currentLine: number | null,
  currentProbability: number | null,
  higher?: ThresholdAlternative | null,
): ThresholdMove | null => {
  if (currentLine === null || !finiteProbability(currentProbability) || !higher) return null;
  if (!finiteProbability(higher.marketImpliedProb) || higher.line <= currentLine) return null;
  const probabilityDelta = currentProbability - higher.marketImpliedProb;
  if (probabilityDelta <= 0) return null;

  return {
    direction: 'up',
    targetLine: higher.line,
    lineDelta: higher.line - currentLine,
    targetProbability: higher.marketImpliedProb,
    probabilityDelta,
    bestPrice: higher.bestPrice,
    consensusPrice: higher.consensusPrice,
    sourceCount: higher.sourceCount ?? null,
  };
};

export function optimizeThreshold(input: ThresholdOptimizationInput): ThresholdOptimization {
  const stepDown = buildStepDown(input.currentLine, input.currentProbability, input.lower);
  const stepUp = buildStepUp(input.currentLine, input.currentProbability, input.higher);

  if (
    stepDown
    && stepDown.probabilityDelta >= MIN_STEP_DOWN_GAIN
    && (input.currentTier === 'pushed' || input.recentFormStatus === 'tension')
  ) {
    return {
      decision: 'step_down',
      reason: `Reduce the ask by ${stepDown.lineDelta} to gain ${Math.round(stepDown.probabilityDelta * 100)} points of sportsbook-implied probability.`,
      stepDown,
      stepUp,
    };
  }

  const efficientStepUp = Boolean(
    input.allowEscalation
    && input.currentTier !== 'pushed'
    && input.recentFormStatus !== 'tension'
    && stepUp
    && stepUp.probabilityDelta <= MAX_EFFICIENT_STEP_UP_COST
    && stepUp.targetProbability >= MIN_ESCALATED_PROBABILITY,
  );

  if (efficientStepUp && stepUp) {
    return {
      decision: 'step_up',
      reason: `A ${stepUp.lineDelta}-unit increase costs ${Math.round(stepUp.probabilityDelta * 100)} points of sportsbook-implied probability and stays above the escalation floor.`,
      stepDown,
      stepUp,
    };
  }

  if (stepUp && input.allowEscalation) {
    return {
      decision: 'hold',
      reason: stepUp.targetProbability < MIN_ESCALATED_PROBABILITY
        ? `Hold the current line: the next tier falls below ${Math.round(MIN_ESCALATED_PROBABILITY * 100)}% sportsbook-implied probability.`
        : `Hold the current line: the next tier costs ${Math.round(stepUp.probabilityDelta * 100)} probability points, above the ${Math.round(MAX_EFFICIENT_STEP_UP_COST * 100)}-point escalation budget.`,
      stepDown,
      stepUp,
    };
  }

  return {
    decision: 'hold',
    reason: input.allowEscalation
      ? 'Hold the current line: no verified adjacent higher tier supports a selective escalation.'
      : 'Hold the current line: the ticket has no push budget available for another escalation.',
    stepDown,
    stepUp,
  };
}
