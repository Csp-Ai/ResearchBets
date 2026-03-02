import { z } from 'zod';

const RunLegSchema = z.object({
  player: z.string().min(1),
  market: z.string().min(1),
  line: z.string().min(1),
  odds: z.string().min(1),
  game_id: z.string().min(1)
});

export const RunInputSchema = z.object({
  trace_id: z.string().optional(),
  traceId: z.string().optional(),
  spine: z.record(z.unknown()).optional(),
  legs: z.array(RunLegSchema).min(1)
});

export type DraftRunInput = z.infer<typeof RunInputSchema>;

export function draftSlipToCanonicalSlipText(input: DraftRunInput): string {
  return input.legs
    .map((leg) => `${leg.player} ${leg.market} ${leg.line} (${leg.odds}) [game:${leg.game_id}]`)
    .join('\n');
}
