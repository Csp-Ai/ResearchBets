export type ParsedSlipLeg = {
  player: string;
  market: string;
  line?: string;
  odds?: string;
};

export type ParsedSlip = {
  book: 'FanDuel' | 'PrizePicks' | 'Kalshi';
  legs: ParsedSlipLeg[];
  rawText: string;
};
