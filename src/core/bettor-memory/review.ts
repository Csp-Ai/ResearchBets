import type {
  AccountActivityImportRecord,
  ArtifactReviewAccountActivity,
  ArtifactReviewSlip,
  ArtifactReviewSlipLeg,
  DataSourceProvenance,
  FieldReview,
  ParsedSlipLegRecord,
  ParsedSlipRecord,
  ReviewFieldState,
  VerificationStatus,
} from './types';

const lowConfidenceThreshold = 0.55;

export function deriveParserConfidenceLabel(confidence: number | null | undefined): 'high' | 'medium' | 'low' | 'unknown' {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) return 'unknown';
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

export function deriveVerificationStatus(input: {
  hasParse: boolean;
  isDemo: boolean;
  parserConfidence: number | null;
  hasHumanReview: boolean;
  rejected?: boolean;
  verified?: boolean;
}): VerificationStatus {
  if (input.rejected) return 'rejected';
  if (input.verified) return 'verified';
  if (!input.hasParse) return input.hasHumanReview ? 'parse_pending' : 'uploaded';
  if (input.isDemo) return 'parsed_demo';
  if ((input.parserConfidence ?? 0) < lowConfidenceThreshold) return 'needs_review';
  return input.hasHumanReview ? 'needs_review' : 'parsed_unverified';
}

export function deriveDataSourceProvenance(status: VerificationStatus, isDemo: boolean): DataSourceProvenance {
  if (status === 'verified') return 'bettor_verified';
  if (isDemo || status === 'parsed_demo') return 'demo_parse';
  if (status === 'uploaded' || status === 'parse_pending') return 'raw_upload';
  return 'parser_output';
}

function fieldState<T>(original: T | null | undefined, current: T | null | undefined): ReviewFieldState {
  if (current == null || current === '') return 'unknown';
  return original === current ? 'confirmed' : 'edited';
}

function buildFieldReview<T>(original: T | null | undefined, current: T | null | undefined): FieldReview<T> {
  const value = current ?? null;
  return { value, state: fieldState(original, current) };
}

export function buildSlipReviewFields(record: ParsedSlipRecord): ArtifactReviewSlip['fields'] {
  const original = (record.verified_snapshot_json ?? record.parse_snapshot_json ?? {}) as Partial<ParsedSlipRecord>;
  return {
    sportsbook: buildFieldReview(original.sportsbook, record.sportsbook),
    placed_at: buildFieldReview(original.placed_at, record.placed_at),
    settled_at: buildFieldReview(original.settled_at, record.settled_at),
    stake: buildFieldReview(original.stake, record.stake),
    payout: buildFieldReview(original.payout, record.payout),
    potential_payout: buildFieldReview(original.potential_payout, record.potential_payout),
    odds: buildFieldReview(original.odds, record.odds),
    status: buildFieldReview(original.status, record.status),
    sport: buildFieldReview(original.sport, record.sport),
    league: buildFieldReview(original.league, record.league),
  };
}

export function buildSlipLegReviewFields(record: ParsedSlipLegRecord): ArtifactReviewSlipLeg['fields'] {
  const original = (record.verified_snapshot_json ?? record.parse_snapshot_json ?? {}) as Partial<ParsedSlipLegRecord>;
  return {
    player_name: buildFieldReview(original.player_name, record.player_name),
    team_name: buildFieldReview(original.team_name, record.team_name),
    market_type: buildFieldReview(original.market_type, record.market_type),
    line: buildFieldReview(original.line, record.line),
    over_under_or_side: buildFieldReview(original.over_under_or_side, record.over_under_or_side),
    odds: buildFieldReview(original.odds, record.odds),
    result: buildFieldReview(original.result, record.result),
    event_descriptor: buildFieldReview(original.event_descriptor, record.event_descriptor),
    sport: buildFieldReview(original.sport, record.sport),
    league: buildFieldReview(original.league, record.league),
    normalized_market_label: buildFieldReview(original.normalized_market_label, record.normalized_market_label),
  };
}

export function buildAccountActivityReviewFields(record: AccountActivityImportRecord): ArtifactReviewAccountActivity['fields'] {
  const original = (record.verified_snapshot_json ?? record.parse_snapshot_json ?? {}) as Partial<AccountActivityImportRecord>;
  return {
    source_sportsbook: buildFieldReview(original.source_sportsbook, record.source_sportsbook),
    beginning_balance: buildFieldReview(original.beginning_balance, record.beginning_balance),
    end_balance: buildFieldReview(original.end_balance, record.end_balance),
    deposited: buildFieldReview(original.deposited, record.deposited),
    played_staked: buildFieldReview(original.played_staked, record.played_staked),
    won_returned: buildFieldReview(original.won_returned, record.won_returned),
    withdrawn: buildFieldReview(original.withdrawn, record.withdrawn),
    rebated: buildFieldReview(original.rebated, record.rebated),
    promotions_awarded: buildFieldReview(original.promotions_awarded, record.promotions_awarded),
    promotions_played: buildFieldReview(original.promotions_played, record.promotions_played),
    promotions_expired: buildFieldReview(original.promotions_expired, record.promotions_expired),
    bets_placed: buildFieldReview(original.bets_placed, record.bets_placed),
    bets_won: buildFieldReview(original.bets_won, record.bets_won),
    activity_window_start: buildFieldReview(original.activity_window_start, record.activity_window_start),
    activity_window_end: buildFieldReview(original.activity_window_end, record.activity_window_end),
  };
}

export function preferVerifiedRecords<T extends { source_artifact_id: string | null; verification_status: VerificationStatus; updated_at?: string; created_at?: string }>(records: T[]): T[] {
  const grouped = new Map<string, T[]>();
  for (const record of records) {
    const key = record.source_artifact_id ?? `standalone:${record.created_at ?? record.updated_at ?? Math.random()}`;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }
  return [...grouped.values()].map((items) => items.sort((a, b) => {
    const rank = (value: VerificationStatus) => value === 'verified' ? 0 : value === 'needs_review' ? 1 : value === 'parsed_unverified' ? 2 : value === 'parsed_demo' ? 3 : 4;
    return rank(a.verification_status) - rank(b.verification_status) || String(b.updated_at ?? b.created_at ?? '').localeCompare(String(a.updated_at ?? a.created_at ?? ''));
  })[0] as T);
}
