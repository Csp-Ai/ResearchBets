import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { executeAgent } from '../executeAgent';
import { AgentErrorCode } from '../errors';
import { createDeterministicRunId } from '../ids';
import { InMemoryTraceEmitter } from '../trace';
import type { AgentDefinition } from '../types';

const baseContext = {
  requestId: 'req_123',
  userId: 'usr_456',
  environment: 'dev' as const,
  trigger: 'unit_test',
  inputType: 'json',
};

describe('executeAgent', () => {
  it('valid input path emits expected trace sequence and validates output', async () => {
    const traceEmitter = new InMemoryTraceEmitter();
    const agent: AgentDefinition<{ value: number }, { doubled: number }> = {
      id: 'double-agent',
      version: '1.0.0',
      inputSchema: z.object({ value: z.number().int() }),
      outputSchema: z.object({ doubled: z.number().int() }),
      handler: async (_context, input) => ({ doubled: input.value * 2 }),
    };

    const response = await executeAgent(agent, { value: 2 }, { ...baseContext, traceEmitter });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.result).toEqual({ doubled: 4 });
    }

    expect(traceEmitter.getEvents().map((event) => event.eventName)).toEqual([
      'RUN_STARTED',
      'INPUT_VALIDATED',
      'AGENT_STARTED',
      'AGENT_FINISHED',
      'OUTPUT_VALIDATED',
      'RUN_FINISHED',
    ]);
  });

  it('invalid input fails with correct error code and trace events', async () => {
    const traceEmitter = new InMemoryTraceEmitter();
    const agent: AgentDefinition<{ value: number }, { doubled: number }> = {
      id: 'double-agent',
      version: '1.0.0',
      inputSchema: z.object({ value: z.number().int() }),
      outputSchema: z.object({ doubled: z.number().int() }),
      handler: async (_context, input) => ({ doubled: input.value * 2 }),
    };

    const response = await executeAgent(agent, { value: '2' }, { ...baseContext, traceEmitter });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(AgentErrorCode.INVALID_INPUT);
    }

    expect(traceEmitter.getEvents().map((event) => event.eventName)).toEqual(['RUN_STARTED', 'RUN_FAILED']);
  });

  it('agent throws error -> classified error + RUN_FAILED event', async () => {
    const traceEmitter = new InMemoryTraceEmitter();
    const agent: AgentDefinition<{ value: number }, { doubled: number }> = {
      id: 'broken-agent',
      version: '1.0.0',
      inputSchema: z.object({ value: z.number().int() }),
      outputSchema: z.object({ doubled: z.number().int() }),
      handler: async () => {
        throw new Error('downstream service exploded');
      },
    };

    const response = await executeAgent(agent, { value: 3 }, { ...baseContext, traceEmitter });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe(AgentErrorCode.AGENT_EXECUTION_FAILED);
    }

    const events = traceEmitter.getEvents();
    expect(events.at(-1)?.eventName).toBe('RUN_FAILED');
    expect(events.at(-1)?.payload.errorCode).toBe(AgentErrorCode.AGENT_EXECUTION_FAILED);
  });

  it('deterministic runId behavior given same seedParts', () => {
    const seedParts = ['agent-a', '1.0.0', 'req_123', '{"a":1}'];
    const first = createDeterministicRunId(seedParts);
    const second = createDeterministicRunId(seedParts);

    expect(first).toBe(second);
  });
});
