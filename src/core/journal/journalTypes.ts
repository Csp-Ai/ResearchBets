export type JournalEntry = {
  entryId: string;
  slipId: string;
  createdAtIso: string;
  status: 'alive' | 'eliminated' | 'settled';
  eliminatedByLegId?: string;
  slateNarrative?: string;
  leadsUsed?: Array<{ legId: string; conviction: number; volatility: string }>;
  whatHit: string[];
  whatMissed: string[];
  runbackCandidates: string[];
  notes: string[];
};
