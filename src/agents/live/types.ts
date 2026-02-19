import type { MarketType } from '../../core/markets/marketType';
import type { DataProvenance } from '../../core/sources/provenance';

export type PlatformName = 'FanDuel' | 'PrizePicks' | 'Kalshi';

export interface PlatformLine {
  platform: PlatformName;
  marketType: MarketType;
  player: string;
  line: number;
  odds?: number;
  payout?: number;
  asOf: string;
  sources: DataProvenance['sources'];
}

export interface HitProfile {
  l5: number;
  l10: number;
  seasonAvg: number;
  vsOpponent?: number;
}

export interface HitProfileResult {
  hitProfile: HitProfile;
  provenance: DataProvenance;
  fallbackReason?: string;
}

export interface OpponentContextResult {
  defenseRank?: number;
  vsOpponent?: number;
  provenance: DataProvenance;
  fallbackReason?: string;
}

export interface InjuryScoutResult {
  tags: string[];
  severity: 'low' | 'medium' | 'high';
  provenance: DataProvenance;
  fallbackReason?: string;
}

export interface LineWatcherResult {
  platformLines: PlatformLine[];
  consensusLine: number | null;
  divergence: {
    spread: number;
    bestLine: PlatformLine | null;
    worstLine: PlatformLine | null;
    warning: boolean;
  };
  provenance: DataProvenance;
  fallbackReason?: string;
}

export interface LiveLegResearch {
  selection: string;
  marketType: MarketType;
  hitProfile: HitProfileResult;
  lineContext: LineWatcherResult;
  opponentContext: OpponentContextResult;
  injury: InjuryScoutResult;
  verdict: {
    score: number;
    label: 'Strong' | 'Lean' | 'Pass';
    riskTag: 'Low' | 'Medium' | 'High';
  };
  fallbackReason?: string;
}
