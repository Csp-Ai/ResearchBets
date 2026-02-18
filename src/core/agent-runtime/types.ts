import type { ZodType, ZodTypeDef } from 'zod';

import type { AgentErrorCode } from './errors';
import type { TraceEmitter } from './trace';

export type AgentInput = Record<string, unknown>;
export type AgentOutput = Record<string, unknown>;

export interface AgentContext {
  requestId: string;
  runId?: string;
  traceId?: string;
  userId?: string | null;
  environment?: 'dev' | 'staging' | 'prod';
  sessionId?: string;
  trigger?: string;
  inputType?: string;
  inputSize?: number;
  traceEmitter?: TraceEmitter;
}

export interface AgentDefinition<TInput extends AgentInput, TOutput extends AgentOutput> {
  id: string;
  version: string;
  inputSchema: ZodType<TInput, ZodTypeDef, unknown>;
  outputSchema: ZodType<TOutput, ZodTypeDef, unknown>;
  handler: (context: AgentContext, input: TInput) => Promise<TOutput>;
}

export interface AgentError {
  code: AgentErrorCode;
  type: string;
  message: string;
  retryable: boolean;
}

export interface AgentRunSuccess<TOutput extends AgentOutput> {
  ok: true;
  result: TOutput;
  traceId: string;
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  agentId: string;
  version: string;
}

export interface AgentRunFailure {
  ok: false;
  error: AgentError;
  traceId: string;
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  agentId: string;
  version: string;
}

export type AgentRunResponse<TOutput extends AgentOutput> = AgentRunSuccess<TOutput> | AgentRunFailure;

export type AgentResult<TOutput extends AgentOutput> = Promise<AgentRunResponse<TOutput>>;
