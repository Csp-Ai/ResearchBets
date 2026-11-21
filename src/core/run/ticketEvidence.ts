import { z } from 'zod';

import { SUPPORTED_MARKET_TYPES } from '@/src/core/markets/marketType';

export const ticketEvidenceRequest = z.object({
  legs: z.array(z.object({
    id: z.string().min(1).max(100),
    player: z.string().trim().min(1).max(100),
    league: z.string().max(20),
    market: z.enum(SUPPORTED_MARKET_TYPES),
    matchup: z.string().trim().max(120).optional()
  })).min(1).max(30)
});

export type TicketEvidenceRequest = z.infer<typeof ticketEvidenceRequest>;

export type TicketEvidence = {
  event?: {
    matchup: string;
    eventDate: string;
    source: 'The Odds API';
    retrievedAt: string;
    freshness: 'live';
  };
  injuries?: {
    report: string;
    source: 'SportsDataIO';
    retrievedAt: string;
    updatedAt: string;
    freshness: 'recent' | 'stale';
  };
  history?: {
    games: Array<{ date: string; value: number }>;
    source: 'SportsDataIO';
    retrievedAt: string;
    freshness: 'historical' | 'cached historical';
  };
};

export type TicketEvidenceResponse = { byLegId: Record<string, TicketEvidence> };
