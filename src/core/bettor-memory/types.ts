export type VerificationStatus = 'uploaded' | 'parse_pending' | 'parsed_demo' | 'parsed_unverified' | 'needs_review' | 'verified' | 'rejected' | 'unverified';
export type ParseStatus = 'pending' | 'parsed' | 'partial' | 'failed';
export type ArtifactType =
  | 'slip_screenshot'
  | 'account_activity_screenshot'
  | 'bet_result_screenshot'
  | 'unknown_betting_artifact';
export type SlipStatus = 'open' | 'won' | 'lost' | 'pushed' | 'cashed_out' | 'partial' | 'unknown';
export type DataSourceProvenance = 'raw_upload' | 'parser_output' | 'demo_parse' | 'bettor_verified';
export type PostmortemTag =
  | 'correlated_same_game'
  | 'longshot_parlay'
  | 'stake_escalation'
  | 'market_concentration'
  | 'late_line_chase'
  | 'strong_rebounds'
  | 'weak_alt_ladders';
export type BettorIdentity =
  | 'selective_striker'
  | 'longshot_parlay_bettor'
  | 'live_opportunist'
  | 'volume_grinder'
  | 'ladder_hunter';

export type ReviewFieldState = 'confirmed' | 'edited' | 'unknown';
export type FieldReview<T> = { value: T | null; state: ReviewFieldState; note?: string | null };
export type ReviewAuditSnapshot = {
  parse_snapshot: Record<string, unknown> | null;
  verified_snapshot: Record<string, unknown> | null;
  last_reviewed_at: string | null;
};

export type BettorArtifactRecord = {
  artifact_id: string;
  bettor_id: string;
  storage_path: string;
  object_url: string | null;
  artifact_type: ArtifactType;
  source_sportsbook: string | null;
  upload_timestamp: string;
  parse_status: ParseStatus;
  parser_version: string | null;
  confidence_score: number | null;
  verification_status: VerificationStatus;
  parser_confidence_label?: 'high' | 'medium' | 'low' | 'unknown';
  data_source: DataSourceProvenance;
  raw_extracted_text: string | null;
  raw_parse_json: Record<string, unknown> | null;
  review_notes_json?: Record<string, unknown> | null;
  last_reviewed_at?: string | null;
  preview_metadata: { width: number | null; height: number | null; mime_type: string | null; size_bytes: number | null };
};

export type ParsedSlipLegRecord = {
  leg_id: string;
  slip_id: string;
  player_name: string | null;
  team_name: string | null;
  market_type: string | null;
  line: number | null;
  over_under_or_side: string | null;
  odds: number | null;
  result: 'won' | 'lost' | 'pushed' | 'unknown' | null;
  event_descriptor: string | null;
  sport: string | null;
  league: string | null;
  confidence_score: number | null;
  verification_status: VerificationStatus;
  normalized_market_label: string | null;
  data_source?: DataSourceProvenance;
  parse_snapshot_json?: Record<string, unknown> | null;
  verified_snapshot_json?: Record<string, unknown> | null;
  last_reviewed_at?: string | null;
};

export type ParsedSlipRecord = {
  slip_id: string;
  bettor_id: string;
  source_artifact_id: string | null;
  sportsbook: string | null;
  placed_at: string | null;
  settled_at: string | null;
  stake: number | null;
  payout: number | null;
  potential_payout: number | null;
  odds: number | null;
  status: SlipStatus;
  leg_count: number;
  sport: string | null;
  league: string | null;
  confidence_score: number | null;
  parse_quality: ParseStatus;
  verification_status: VerificationStatus;
  data_source?: DataSourceProvenance;
  raw_source_reference: string | null;
  parse_snapshot_json?: Record<string, unknown> | null;
  verified_snapshot_json?: Record<string, unknown> | null;
  last_reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  legs: ParsedSlipLegRecord[];
};

export type AccountActivityImportRecord = {
  activity_import_id: string;
  bettor_id: string;
  source_artifact_id: string | null;
  source_sportsbook: string | null;
  beginning_balance: number | null;
  end_balance: number | null;
  deposited: number | null;
  played_staked: number | null;
  won_returned: number | null;
  withdrawn: number | null;
  rebated: number | null;
  promotions_awarded: number | null;
  promotions_played: number | null;
  promotions_expired: number | null;
  bets_placed: number | null;
  bets_won: number | null;
  activity_window_start: string | null;
  activity_window_end: string | null;
  verification_status: VerificationStatus;
  parse_quality: ParseStatus;
  confidence_score: number | null;
  data_source?: DataSourceProvenance;
  parse_snapshot_json?: Record<string, unknown> | null;
  verified_snapshot_json?: Record<string, unknown> | null;
  last_reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type BettorPostmortemRecord = {
  postmortem_id: string;
  bettor_id: string;
  slip_id: string;
  outcome_summary: string;
  weakest_leg_candidates: string[];
  strongest_legs: string[];
  correlated_risk_notes: string[];
  market_concentration_notes: string[];
  slip_size_notes: string[];
  confidence_score: number | null;
  evidence: { basis: 'verified_history' | 'unverified_parse' | 'demo_inference'; note: string }[];
  advisory_tags: PostmortemTag[];
  created_at: string;
};

export type BettorProfileRecord = {
  bettor_id: string;
  username: string | null;
  display_name: string | null;
  timezone: string | null;
  preferred_sportsbooks: string[];
  bettor_identity: BettorIdentity | null;
  advisory_signals: string[];
  historical_aggregates: Record<string, number | string | null>;
  created_at: string;
  updated_at: string;
};

export type ArtifactReviewSlipLeg = ParsedSlipLegRecord & {
  fields: {
    player_name: FieldReview<string>;
    team_name: FieldReview<string>;
    market_type: FieldReview<string>;
    line: FieldReview<number>;
    over_under_or_side: FieldReview<string>;
    odds: FieldReview<number>;
    result: FieldReview<'won' | 'lost' | 'pushed' | 'unknown'>;
    event_descriptor: FieldReview<string>;
    sport: FieldReview<string>;
    league: FieldReview<string>;
    normalized_market_label: FieldReview<string>;
  };
};

export type ArtifactReviewSlip = ParsedSlipRecord & {
  fields: {
    sportsbook: FieldReview<string>;
    placed_at: FieldReview<string>;
    settled_at: FieldReview<string>;
    stake: FieldReview<number>;
    payout: FieldReview<number>;
    potential_payout: FieldReview<number>;
    odds: FieldReview<number>;
    status: FieldReview<SlipStatus>;
    sport: FieldReview<string>;
    league: FieldReview<string>;
  };
  legs: ArtifactReviewSlipLeg[];
};

export type ArtifactReviewAccountActivity = AccountActivityImportRecord & {
  fields: {
    source_sportsbook: FieldReview<string>;
    beginning_balance: FieldReview<number>;
    end_balance: FieldReview<number>;
    deposited: FieldReview<number>;
    played_staked: FieldReview<number>;
    won_returned: FieldReview<number>;
    withdrawn: FieldReview<number>;
    rebated: FieldReview<number>;
    promotions_awarded: FieldReview<number>;
    promotions_played: FieldReview<number>;
    promotions_expired: FieldReview<number>;
    bets_placed: FieldReview<number>;
    bets_won: FieldReview<number>;
    activity_window_start: FieldReview<string>;
    activity_window_end: FieldReview<string>;
  };
};

export type ArtifactReviewRecord = {
  artifact: BettorArtifactRecord & { preview_url: string | null };
  slip: ArtifactReviewSlip | null;
  accountActivity: ArtifactReviewAccountActivity | null;
  review: ReviewAuditSnapshot & {
    verification_status: VerificationStatus;
    parser_confidence: number | null;
    parser_confidence_label: 'high' | 'medium' | 'low' | 'unknown';
    data_source: DataSourceProvenance;
    needs_human_review: boolean;
    review_reason: string;
  };
};

export type BettorMemorySnapshot = {
  profile: BettorProfileRecord;
  artifacts: BettorArtifactRecord[];
  slips: ParsedSlipRecord[];
  accountActivity: AccountActivityImportRecord[];
  postmortems: BettorPostmortemRecord[];
  mode: 'live' | 'demo';
  credibility: {
    basis: 'verified_imported_history' | 'unverified_screenshot_parsing' | 'partial_data' | 'demo_data';
    label: string;
    detail: string;
  };
};
