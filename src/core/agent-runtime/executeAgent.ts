import { classifyError } from './errors';
import { createDeterministicRunId, createTraceId } from './ids';
import type { RuntimeEventName, TraceEmitter } from './trace';
import { InMemoryTraceEmitter } from './trace';
import type { AgentContext, AgentDefinition, AgentInput, AgentOutput, AgentRunResponse } from './types';
import { validateWithSchema } from './validate';

const nowIso = (): string => new Date().toISOString();

const mapEventName = (eventName: RuntimeEventName): 'agent_invocation_started' | 'agent_invocation_completed' | 'agent_error' => {
  if (eventName === 'RUN_FAILED') {
    return 'agent_error';
  }

  if (eventName === 'RUN_FINISHED') {
    return 'agent_invocation_completed';
  }

  return 'agent_invocation_started';
};

const emitRuntimeEvent = async ({
  emitter,
  eventName,
  traceId,
  runId,
  context,
  agent,
  latencyMs,
  payload,
}: {
  emitter: TraceEmitter;
  eventName: RuntimeEventName;
  traceId: string;
  runId: string;
  context: AgentContext;
  agent: Pick<AgentDefinition<AgentInput, AgentOutput>, 'id' | 'version'>;
  latencyMs?: number;
  payload?: Record<string, unknown>;
}): Promise<void> => {
  await emitter.emit({
    eventName,
    observabilityEventName: mapEventName(eventName),
    timestamp: nowIso(),
    traceId,
    runId,
    requestId: context.requestId,
    userId: context.userId ?? null,
    agentId: agent.id,
    modelVersion: agent.version,
    confidence: null,
    assumptions: null,
    latencyMs,
    tokensIn: null,
    tokensOut: null,
    costUsd: null,
    environment: context.environment,
    sessionId: context.sessionId,
    payload: payload ?? {},
  });
};

export const executeAgent = async <TInput extends AgentInput, TOutput extends AgentOutput>(
  agent: AgentDefinition<TInput, TOutput>,
  input: unknown,
  context: AgentContext,
): Promise<AgentRunResponse<TOutput>> => {
  const startedAt = nowIso();
  const startMs = Date.now();
  const traceId = createTraceId();
  const runId = createDeterministicRunId([agent.id, agent.version, context.requestId, JSON.stringify(input)]);
  const emitter = context.traceEmitter ?? new InMemoryTraceEmitter();

  await emitRuntimeEvent({
    emitter,
    eventName: 'RUN_STARTED',
    traceId,
    runId,
    context,
    agent,
    payload: {
      inputType: context.inputType ?? 'unknown',
      inputSize: context.inputSize ?? JSON.stringify(input).length,
      trigger: context.trigger ?? 'unknown',
    },
  });

  try {
    const validatedInput = validateWithSchema(agent.inputSchema, input, 'input');

    await emitRuntimeEvent({ emitter, eventName: 'INPUT_VALIDATED', traceId, runId, context, agent });
    await emitRuntimeEvent({ emitter, eventName: 'AGENT_STARTED', traceId, runId, context, agent });

    const rawOutput = await agent.handler({ ...context, runId, traceId }, validatedInput);

    await emitRuntimeEvent({ emitter, eventName: 'AGENT_FINISHED', traceId, runId, context, agent });

    const validatedOutput = validateWithSchema(agent.outputSchema, rawOutput, 'output');

    await emitRuntimeEvent({ emitter, eventName: 'OUTPUT_VALIDATED', traceId, runId, context, agent });

    const finishedAt = nowIso();
    const durationMs = Date.now() - startMs;

    await emitRuntimeEvent({
      emitter,
      eventName: 'RUN_FINISHED',
      traceId,
      runId,
      context,
      agent,
      latencyMs: durationMs,
      payload: {
        status: 'success',
        outputType: 'json',
        durationMs,
        runId,
        tokensIn: null,
        tokensOut: null,
      },
    });

    return {
      ok: true,
      result: validatedOutput,
      traceId,
      runId,
      startedAt,
      finishedAt,
      durationMs,
      agentId: agent.id,
      version: agent.version,
    };
  } catch (error) {
    const finishedAt = nowIso();
    const durationMs = Date.now() - startMs;
    const classifiedError = classifyError(error);

    await emitRuntimeEvent({
      emitter,
      eventName: 'RUN_FAILED',
      traceId,
      runId,
      context,
      agent,
      latencyMs: durationMs,
      payload: {
        runId,
        status: 'error',
        errorCode: classifiedError.code,
        errorType: classifiedError.type,
        errorMessage: classifiedError.message,
        retryable: classifiedError.retryable,
      },
    });

    return {
      ok: false,
      error: classifiedError,
      traceId,
      runId,
      startedAt,
      finishedAt,
      durationMs,
      agentId: agent.id,
      version: agent.version,
    };
  }
};
