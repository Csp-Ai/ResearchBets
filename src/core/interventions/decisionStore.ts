import type { MarketType } from '@/src/core/markets/marketType';

const APPLIED_INTERVENTIONS_KEY = 'rb:applied-threshold-interventions:v1';
const MAX_APPLIED_INTERVENTIONS = 100;

export type AppliedThresholdIntervention = {
  interventionId: string;
  appliedAt: string;
  traceId: string;
  slipId?: string | null;
  mode?: 'live' | 'cache' | 'demo';
  interventionType: 'safety' | 'escalation';
  legId: string;
  player: string;
  marketType: MarketType;
  currentLine: number;
  targetLine: number;
  currentProbability: number;
  targetProbability: number;
  probabilityDelta: number;
};

const readAppliedInterventions = (): AppliedThresholdIntervention[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(APPLIED_INTERVENTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppliedThresholdIntervention[]) : [];
  } catch {
    return [];
  }
};

export function saveAppliedIntervention(record: AppliedThresholdIntervention): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = readAppliedInterventions();
    const deduped = [
      record,
      ...existing.filter((item) => item.interventionId !== record.interventionId),
    ].slice(0, MAX_APPLIED_INTERVENTIONS);
    window.localStorage.setItem(APPLIED_INTERVENTIONS_KEY, JSON.stringify(deduped));
  } catch {
    // This mirror is best-effort. Server telemetry remains the durable decision record.
  }
}

export function listAppliedInterventionsForTicket(identity: {
  traceId?: string | null;
  slipId?: string | null;
}): AppliedThresholdIntervention[] {
  if (!identity.traceId && !identity.slipId) return [];

  return readAppliedInterventions()
    .filter((record) => {
      if (identity.traceId) {
        if (record.traceId !== identity.traceId) return false;
        if (identity.slipId && record.slipId && record.slipId !== identity.slipId) return false;
        return true;
      }
      return Boolean(identity.slipId && record.slipId === identity.slipId);
    })
    .sort((a, b) => Date.parse(b.appliedAt) - Date.parse(a.appliedAt));
}
