export type TrustedSourceRef = {
  provider: 'sportsdataio' | 'theoddsapi' | 'league_official' | 'team_official' | 'transactions_wire' | 'coverage_agent' | string;
  url?: string;
  label: string;
  retrievedAt: string;
  trust?: 'verified' | 'unverified';
};

export type TrustedContextItem = {
  kind: 'injury' | 'suspension' | 'status' | 'transaction' | 'line_movement' | 'schedule_spot' | 'note';
  subject: { sport: string; teamId?: string; team?: string; playerId?: string; player?: string; eventId?: string };
  headline: string;
  detail?: string;
  confidence: 'verified' | 'likely' | 'unknown';
  trust?: 'verified' | 'unverified';
  asOf: string;
  sources: TrustedSourceRef[];
};

export type TrustedContextBundle = {
  asOf: string;
  items: TrustedContextItem[];
  unverifiedItems?: TrustedContextItem[];
  coverage: {
    injuries: 'live' | 'fallback' | 'none';
    transactions: 'live' | 'fallback' | 'none';
    odds: 'live' | 'fallback' | 'none';
    schedule: 'computed' | 'none';
  };
  fallbackReason?: string;
};
