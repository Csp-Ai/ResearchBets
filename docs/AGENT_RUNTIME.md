# Agent Execution Runtime

## Overview
`src/core/agent-runtime` is the canonical execution path for all agents. It enforces governance and observability concerns centrally:

- Input and output schema validation (Zod).
- Deterministic run IDs + generated trace IDs.
- Structured trace events (no direct console logging).
- Error classification with stable error codes.
- Consistent run response envelope.

## How to Define an Agent
Create an agent definition under `src/agents/<agent-name>/`.

```ts
import { z } from 'zod';
import type { AgentDefinition } from '../../core/agent-runtime/types';

const InputSchema = z.object({ prompt: z.string() });
const OutputSchema = z.object({ summary: z.string() });

export const MyAgent: AgentDefinition<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> = {
  id: 'my-agent',
  version: '1.0.0',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async (_ctx, input) => ({ summary: input.prompt }),
};
```

Then register it in `src/agents/index.ts`.

## How to Run an Agent from Registry
Use `runFromRegistry`:

```ts
import { runFromRegistry } from '../core/agent-runtime/runFromRegistry';

const result = await runFromRegistry({
  agentId: 'example-agent',
  input: { prompt: 'Analyze game totals', maxRecommendations: 3 },
  context: { requestId: 'req_1', userId: 'usr_1', environment: 'prod' },
});
```

All registry execution paths call `executeAgent`, so validation + traces + error handling are applied uniformly.

## Trace Event Contract
Runtime emits the following event names in order on success:

1. `RUN_STARTED`
2. `INPUT_VALIDATED`
3. `AGENT_STARTED`
4. `AGENT_FINISHED`
5. `OUTPUT_VALIDATED`
6. `RUN_FINISHED`

On failure, runtime emits `RUN_FAILED` after `RUN_STARTED` (or after any prior completed stages).

Each trace event includes observability-aligned fields such as:
- `requestId`, `traceId`, `runId`
- `agentId`, `modelVersion`
- `timestamp`
- latency and token/cost placeholders (`latencyMs`, `tokensIn`, `tokensOut`, `costUsd`)
- event-specific payload metadata

## Where to Add New Agents
- Agent implementation: `src/agents/<agent-name>/<AgentName>.ts`
- Registry wiring: `src/agents/index.ts`
- Tests for behavior/contracts: `src/core/agent-runtime/__tests__/`
