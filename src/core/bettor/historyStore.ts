export type HistoricalBet = {
  id: string;
  slipText: string;
  closingLine?: string;
  outcome: 'win' | 'loss';
  placedAt: string;
};

const globalStore = globalThis as typeof globalThis & { __historyBets?: HistoricalBet[] };
if (!globalStore.__historyBets) globalStore.__historyBets = [];

export const historyStore = {
  list: (): HistoricalBet[] => globalStore.__historyBets ?? [],
  add: (bet: HistoricalBet) => {
    globalStore.__historyBets = [bet, ...(globalStore.__historyBets ?? [])].slice(0, 100);
  }
};
