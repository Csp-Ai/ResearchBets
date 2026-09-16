'use client';

import { createClientRequestId, ensureAnonSessionId } from '@/src/core/identifiers/session';
import type { QuerySpine } from '@/src/core/nervous/spine';

export const HABIT_LOOP_VERSION = 'habit-loop-v1';

export type CanonicalLifecycleStage = 'discover_build' | 'xray' | 'pulse' | 'review_memory';
export type HabitLoopEventName =
  | 'lifecycle_stage_viewed'
  | 'lifecycle_useful_answer_ready'
  | 'lifecycle_guardrail_applied';

type ActiveVisit = {
  stage: CanonicalLifecycleStage;
  route: string;
  visitId: string;
  startedAt: number;
};

let activeVisit: ActiveVisit | null = null;
const emittedKeys = new Set<string>();

export function canonicalStageForPath(pathname: string): CanonicalLifecycleStage | null {
  const normalized = pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;
  if (normalized === '/' || normalized === '/slip' || normalized === '/ingest') return 'discover_build';
  if (normalized === '/stress-test') return 'xray';
  if (normalized === '/pulse' || normalized === '/track') return 'pulse';
  if (normalized === '/review') return 'review_memory';
  return null;
}

export function beginHabitLoopVisit(
  stage: CanonicalLifecycleStage,
  route: string,
  now = typeof performance === 'undefined' ? 0 : performance.now(),
): ActiveVisit {
  if (
    activeVisit
    && activeVisit.stage === stage
    && activeVisit.route === route
    && now - activeVisit.startedAt < 1_000
  ) {
    return activeVisit;
  }

  activeVisit = { stage, route, visitId: createClientRequestId(), startedAt: now };
  return activeVisit;
}

export function buildHabitLoopEvent(input: {
  eventName: HabitLoopEventName;
  stage: CanonicalLifecycleStage;
  route: string;
  visitId: string;
  timestamp: string;
  requestId: string;
  sessionId: string;
  traceId: string;
  spine?: Partial<QuerySpine>;
  properties?: Record<string, unknown>;
}) {
  return {
    event_name: input.eventName,
    timestamp: input.timestamp,
    request_id: input.requestId,
    trace_id: input.traceId,
    session_id: input.sessionId,
    user_id: null,
    agent_id: 'habit_loop',
    model_version: HABIT_LOOP_VERSION,
    mode: input.spine?.mode,
    sport: input.spine?.sport,
    tz: input.spine?.tz,
    date: input.spine?.date,
    properties: {
      ...(input.properties ?? {}),
      stage: input.stage,
      route: input.route,
      visit_id: input.visitId,
      ticket_id: input.spine?.ticketId ?? null,
      slip_id: input.spine?.slip_id ?? null,
      analytics_version: HABIT_LOOP_VERSION,
    },
  };
}

async function emitHabitLoopEvent(input: {
  eventName: HabitLoopEventName;
  stage: CanonicalLifecycleStage;
  route: string;
  visitId: string;
  spine?: Partial<QuerySpine>;
  traceId?: string | null;
  properties?: Record<string, unknown>;
  dedupeKey: string;
}): Promise<void> {
  if (typeof window === 'undefined' || emittedKeys.has(input.dedupeKey)) return;
  emittedKeys.add(input.dedupeKey);

  const sessionId = ensureAnonSessionId();
  const payload = buildHabitLoopEvent({
    eventName: input.eventName,
    stage: input.stage,
    route: input.route,
    visitId: input.visitId,
    timestamp: new Date().toISOString(),
    requestId: createClientRequestId(),
    sessionId,
    traceId: input.traceId ?? input.spine?.trace_id ?? `habit:${sessionId}`,
    spine: input.spine,
    properties: input.properties,
  });

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Habit telemetry must never block the bettor journey.
  }
}

export async function emitHabitStageView(input: {
  pathname: string;
  stage: CanonicalLifecycleStage;
  spine: Partial<QuerySpine>;
  previousStage?: CanonicalLifecycleStage | null;
}): Promise<void> {
  const visit = beginHabitLoopVisit(input.stage, input.pathname);
  await emitHabitLoopEvent({
    eventName: 'lifecycle_stage_viewed',
    stage: input.stage,
    route: input.pathname,
    visitId: visit.visitId,
    spine: input.spine,
    properties: { previous_stage: input.previousStage ?? null },
    dedupeKey: `stage:${visit.visitId}`,
  });
}

export async function emitHabitUsefulAnswer(input: {
  stage: CanonicalLifecycleStage;
  route: string;
  spine: Partial<QuerySpine>;
  answerType: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const visit = activeVisit?.stage === input.stage
    ? activeVisit
    : beginHabitLoopVisit(input.stage, input.route);
  const now = typeof performance === 'undefined' ? visit.startedAt : performance.now();
  await emitHabitLoopEvent({
    eventName: 'lifecycle_useful_answer_ready',
    stage: input.stage,
    route: input.route,
    visitId: visit.visitId,
    spine: input.spine,
    properties: {
      ...(input.properties ?? {}),
      answer_type: input.answerType,
      duration_ms: Math.max(0, Math.round(now - visit.startedAt)),
    },
    dedupeKey: `answer:${visit.visitId}:${input.answerType}`,
  });
}

export async function emitHabitGuardrailApplied(input: {
  ticketId: string;
  traceId?: string | null;
  slipId?: string | null;
  guardrailId: string;
}): Promise<void> {
  const visit = activeVisit?.stage === 'review_memory'
    ? activeVisit
    : beginHabitLoopVisit('review_memory', '/review');
  await emitHabitLoopEvent({
    eventName: 'lifecycle_guardrail_applied',
    stage: 'review_memory',
    route: '/review',
    visitId: visit.visitId,
    traceId: input.traceId,
    spine: { ticketId: input.ticketId, slip_id: input.slipId ?? undefined },
    properties: { guardrail_id: input.guardrailId },
    dedupeKey: `guardrail:${input.ticketId}:${input.guardrailId}`,
  });
}
