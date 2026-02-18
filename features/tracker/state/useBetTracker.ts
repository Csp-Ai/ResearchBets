'use client';

import { useMemo, useState } from 'react';

import {
  betSchema,
  type Bet,
  createBetInputSchema,
  settleBetInputSchema,
  type CreateBetInput,
  type SettleBetInput
} from '@/entities/bet/model';
import { getAnonymousSessionId } from '@/lib/session/anonymousSession';

type TrackerState = {
  bets: Bet[];
};

const nowIso = () => new Date().toISOString();

export function useBetTracker(initialBets: Bet[] = []) {
  const [state, setState] = useState<TrackerState>({
    bets: initialBets.map((bet) => betSchema.parse(bet))
  });

  const addBet = (input: CreateBetInput) => {
    const parsedInput = createBetInputSchema.parse(input);

    const newBet: Bet = betSchema.parse({
      id: crypto.randomUUID(),
      sessionId: getAnonymousSessionId(),
      status: 'open',
      outcome: null,
      settledAt: null,
      placedAt: nowIso(),
      ...parsedInput
    });

    setState((current) => ({ bets: [newBet, ...current.bets] }));
  };

  const settleBet = (input: SettleBetInput) => {
    const parsedInput = settleBetInputSchema.parse(input);

    setState((current) => ({
      bets: current.bets.map((bet) => {
        if (bet.id !== parsedInput.id) {
          return bet;
        }

        return betSchema.parse({
          ...bet,
          status: 'settled',
          outcome: parsedInput.outcome,
          settledAt: parsedInput.settledAt
        });
      })
    }));
  };

  const openBets = useMemo(() => state.bets.filter((bet) => bet.status === 'open'), [state.bets]);

  return {
    bets: state.bets,
    openBets,
    addBet,
    settleBet
  };
}
