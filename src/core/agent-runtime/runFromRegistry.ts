import { agentRegistry } from '../../agents';

import { AgentErrorCode } from './errors';
import { executeAgent } from './executeAgent';
import { createDeterministicRunId, createTraceId } from './ids';
import type { AgentContext, AgentOutput, AgentRunResponse } from './types';

export interface RunFromRegistryArgs {
  agentId: string;
  input: unknown;
  context: AgentContext;
}

export const runFromRegistry = async ({ agentId, input, context }: RunFromRegistryArgs): Promise<AgentRunResponse<AgentOutput>> => {
  const agent = agentRegistry[agentId];

  if (!agent) {
    const startedAt = new Date().toISOString();
    const finishedAt = startedAt;

    return {
      ok: false,
      error: {
        code: AgentErrorCode.UNKNOWN_ERROR,
        type: 'registry',
        message: `Agent not found in registry: ${agentId}`,
        retryable: false,
      },
      traceId: createTraceId(),
      runId: createDeterministicRunId([agentId, context.requestId, JSON.stringify(input)]),
      startedAt,
      finishedAt,
      durationMs: 0,
      agentId,
      version: 'unknown',
    };
  }

  return executeAgent(agent as never, input, context) as Promise<AgentRunResponse<AgentOutput>>;
};
