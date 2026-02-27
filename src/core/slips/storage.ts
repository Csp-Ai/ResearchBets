import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

import { computeSlipStatus } from './slipStatusEngine';
import type { SlipTrackingState, TrackedLegState } from './trackingTypes';

const SLIP_TRACKING_KEY = 'rb:tracked-slips:v1';

function readAll(): Record<string, SlipTrackingState> {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(SLIP_TRACKING_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, SlipTrackingState>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, SlipTrackingState>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SLIP_TRACKING_KEY, JSON.stringify(all));
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function buildSlipId(legs: SlipBuilderLeg[], createdAtIso: string) {
  const base = legs
    .map((leg) => `${leg.player}|${leg.marketType}|${leg.line}|${leg.game ?? 'na'}`)
    .sort()
    .join('~');
  return `slip_${hashString(`${base}:${createdAtIso}`)}`;
}

export function createTrackingFromDraft(legs: SlipBuilderLeg[], mode: SlipTrackingState['mode']): SlipTrackingState {
  const createdAtIso = new Date().toISOString();
  const trackedLegs: TrackedLegState[] = legs.map((leg, index) => ({
    legId: leg.id,
    gameId: leg.game ?? `game-${index + 1}`,
    player: leg.player,
    market: leg.marketType,
    line: leg.line,
    volatility: leg.volatility ?? 'medium',
    convictionAtBuild: typeof leg.confidence === 'number' ? Math.round(leg.confidence * 100) : undefined,
    outcome: 'pending',
    targetValue: Number(leg.line) || null,
    currentValue: 0,
    updatedAtIso: createdAtIso
  }));

  return computeSlipStatus({
    slipId: buildSlipId(legs, createdAtIso),
    createdAtIso,
    mode,
    status: 'alive',
    legs: trackedLegs
  });
}

export function loadSlip(slipId: string): SlipTrackingState | null {
  return readAll()[slipId] ?? null;
}

export function saveSlip(state: SlipTrackingState): void {
  const all = readAll();
  all[state.slipId] = state;
  writeAll(all);
}

export function listRecentSlips(): SlipTrackingState[] {
  return Object.values(readAll()).sort((a, b) => Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso));
}
