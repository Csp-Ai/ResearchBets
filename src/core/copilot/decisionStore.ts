'use client';

import type { BuildCopilotIntent, BuildCopilotRead } from '@/src/core/copilot/buildDecision';

const COPILOT_DECISIONS_KEY = 'rb:copilot-decisions:v1';
const MAX_RECORDS = 150;

export type CopilotDecisionState = 'presented' | 'applied';

export type CopilotDecisionRecord = {
  decisionId: string;
  traceId: string;
  slipId?: string | null;
  createdAt: string;
  updatedAt: string;
  state: CopilotDecisionState;
  intent: BuildCopilotIntent;
  ticketFingerprint: string;
  evidenceState: BuildCopilotRead['evidenceState'];
  headline: string;
  pressure: string;
  evidence: string[];
  actionKind: BuildCopilotRead['action']['kind'];
  actionLabel: string;
  targetLegId?: string;
  currentLine?: number;
  targetLine?: number;
};

const hash = (input: string) => {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(16);
};

export const fingerprintCopilotTicket = (
  legs: Array<{ id: string; player: string; marketType: string; line: string }>,
) =>
  hash(
    legs
      .map((leg) => `${leg.id}|${leg.player.toLowerCase()}|${leg.marketType}|${leg.line}`)
      .sort()
      .join('||'),
  );

const readRecords = (): CopilotDecisionRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COPILOT_DECISIONS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed as CopilotDecisionRecord[] : [];
  } catch {
    return [];
  }
};

const writeRecords = (records: CopilotDecisionRecord[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COPILOT_DECISIONS_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    // Decision history is best-effort locally; server telemetry is emitted separately.
  }
};

export const copilotDecisionId = (input: {
  traceId: string;
  intent: BuildCopilotIntent;
  ticketFingerprint: string;
  read: BuildCopilotRead;
}) => {
  const move = input.read.action.kind === 'apply_threshold'
    ? `${input.read.action.move.legId}:${input.read.action.move.currentLine}:${input.read.action.move.targetLine}`
    : input.read.action.kind;
  return `copilot:${input.traceId}:${input.intent}:${input.ticketFingerprint}:${move}`;
};

export function saveCopilotDecision(input: {
  traceId: string;
  slipId?: string | null;
  ticketFingerprint: string;
  read: BuildCopilotRead;
  state?: CopilotDecisionState;
  at?: string;
}): CopilotDecisionRecord {
  const at = input.at ?? new Date().toISOString();
  const decisionId = copilotDecisionId({
    traceId: input.traceId,
    intent: input.read.intent,
    ticketFingerprint: input.ticketFingerprint,
    read: input.read,
  });
  const existing = readRecords().find((record) => record.decisionId === decisionId);
  const move = input.read.action.kind === 'apply_threshold' ? input.read.action.move : null;

  const record: CopilotDecisionRecord = {
    decisionId,
    traceId: input.traceId,
    slipId: input.slipId,
    createdAt: existing?.createdAt ?? at,
    updatedAt: at,
    state: input.state ?? existing?.state ?? 'presented',
    intent: input.read.intent,
    ticketFingerprint: input.ticketFingerprint,
    evidenceState: input.read.evidenceState,
    headline: input.read.headline,
    pressure: input.read.pressure,
    evidence: input.read.evidence,
    actionKind: input.read.action.kind,
    actionLabel: input.read.action.label,
    targetLegId: move?.legId,
    currentLine: move?.currentLine,
    targetLine: move?.targetLine,
  };

  writeRecords([
    record,
    ...readRecords().filter((candidate) => candidate.decisionId !== decisionId),
  ]);
  return record;
}

export function listCopilotDecisions(identity?: {
  traceId?: string | null;
  slipId?: string | null;
}): CopilotDecisionRecord[] {
  return readRecords()
    .filter((record) => {
      if (!identity) return true;
      if (identity.traceId && record.traceId !== identity.traceId) return false;
      if (identity.slipId && record.slipId && record.slipId !== identity.slipId) return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
