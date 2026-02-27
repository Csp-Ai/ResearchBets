import type { LegOutcome, SlipTrackingState, TrackedLegState } from './trackingTypes';
import { computeSlipStatus } from './slipStatusEngine';

function hashToUnit(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function missTypeFor(leg: TrackedLegState): TrackedLegState['missType'] {
  const signal = hashToUnit(`${leg.legId}:missType`);
  if (signal < 0.2) return 'variance';
  if (signal < 0.4) return 'pace';
  if (signal < 0.6) return 'minutes';
  if (signal < 0.8) return 'role';
  return 'unknown';
}

function computeOutcome(leg: TrackedLegState): LegOutcome {
  const volatilityPenalty = leg.volatility === 'high' ? 0.2 : leg.volatility === 'medium' ? 0.1 : 0.04;
  const convictionBoost = clamp((leg.convictionAtBuild ?? 55) / 100, 0.25, 0.95) * 0.25;
  const outcomeRoll = hashToUnit(`${leg.legId}:outcome`);
  const missThreshold = clamp(0.35 + volatilityPenalty - convictionBoost, 0.15, 0.75);
  const voidThreshold = clamp(missThreshold + 0.04, missThreshold, 0.82);
  if (outcomeRoll < missThreshold) return 'miss';
  if (outcomeRoll < voidThreshold) return 'void';
  return 'hit';
}

export function advanceDemoTracking(state: SlipTrackingState, nowIso: string): SlipTrackingState {
  const createdAtMs = Date.parse(state.createdAtIso);
  const nowMs = Date.parse(nowIso);
  const elapsedMinutes = Math.max(0, (nowMs - createdAtMs) / 60000);

  const legs = state.legs.map((leg) => {
    const legSeed = hashToUnit(`${state.slipId}:${leg.legId}:pace`);
    const settleMinute = 2 + Math.floor(legSeed * 12);
    const progress = clamp(elapsedMinutes / settleMinute, 0, 1);

    const targetValue = leg.targetValue ?? (Number(leg.line) || 10);
    const drift = (hashToUnit(`${leg.legId}:drift`) - 0.5) * 0.35;
    const currentValue = Number((targetValue * clamp(progress + drift, 0, 1.15)).toFixed(2));

    if (leg.outcome !== 'pending') {
      return { ...leg, currentValue, targetValue, updatedAtIso: nowIso };
    }

    if (progress >= 1) {
      const outcome = computeOutcome(leg);
      return {
        ...leg,
        currentValue,
        targetValue,
        outcome,
        missType: outcome === 'miss' ? missTypeFor(leg) : undefined,
        updatedAtIso: nowIso
      };
    }

    return {
      ...leg,
      currentValue,
      targetValue,
      updatedAtIso: nowIso
    };
  });

  return computeSlipStatus({ ...state, legs });
}
