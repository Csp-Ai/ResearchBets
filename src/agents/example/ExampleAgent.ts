import { z } from 'zod';

import type { AgentDefinition } from '../../core/agent-runtime/types';

const ExampleAgentInputSchema = z.object({
  prompt: z.string().min(1),
  maxRecommendations: z.number().int().positive().max(10).default(3),
});

const ExampleAgentOutputSchema = z.object({
  summary: z.string(),
  recommendations: z.array(
    z.object({
      title: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

export type ExampleAgentInput = z.infer<typeof ExampleAgentInputSchema>;
export type ExampleAgentOutput = z.infer<typeof ExampleAgentOutputSchema>;

export const ExampleAgent: AgentDefinition<ExampleAgentInput, ExampleAgentOutput> = {
  id: 'example-agent',
  version: '1.0.0',
  inputSchema: ExampleAgentInputSchema,
  outputSchema: ExampleAgentOutputSchema,
  handler: async (_context, input) => ({
    summary: `Generated ${input.maxRecommendations} recommendations for: ${input.prompt}`,
    recommendations: Array.from({ length: input.maxRecommendations }, (_, index) => ({
      title: `Recommendation ${index + 1}`,
      confidence: Math.max(0.1, 1 - index * 0.1),
    })),
  }),
};
