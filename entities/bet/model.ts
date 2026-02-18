import { z } from 'zod';

export const betStatusSchema = z.enum(['open', 'settled']);
export type BetStatus = z.infer<typeof betStatusSchema>;

export const betOutcomeSchema = z.enum(['won', 'lost', 'push']).nullable();
export type BetOutcome = z.infer<typeof betOutcomeSchema>;

export const betSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  sport: z.string().min(1).max(50),
  market: z.string().min(1).max(120),
  selection: z.string().min(1).max(120),
  oddsAmerican: z
    .number()
    .int()
    .refine((value) => value <= -100 || value >= 100, {
      message: 'American odds must be <= -100 or >= 100.'
    }),
  stake: z.number().positive().max(100000),
  potentialPayout: z.number().positive(),
  eventStartsAt: z.string().datetime(),
  status: betStatusSchema,
  outcome: betOutcomeSchema,
  placedAt: z.string().datetime(),
  settledAt: z.string().datetime().nullable()
});

export type Bet = z.infer<typeof betSchema>;

export const createBetInputSchema = betSchema.omit({
  id: true,
  sessionId: true,
  status: true,
  outcome: true,
  settledAt: true,
  placedAt: true
});
export type CreateBetInput = z.infer<typeof createBetInputSchema>;

export const settleBetInputSchema = z.object({
  id: z.string().uuid(),
  outcome: z.enum(['won', 'lost', 'push']),
  settledAt: z.string().datetime()
});
export type SettleBetInput = z.infer<typeof settleBetInputSchema>;
