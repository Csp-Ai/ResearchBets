export type VerificationStatus = 'verified' | 'unverified' | 'needs_review';
export type ParseStatus = 'pending' | 'parsed' | 'partial' | 'failed';
export type ArtifactType =
  | 'slip_screenshot'
  | 'account_activity_screenshot'
  | 'bet_result_screenshot'
  | 'unknown_betting_artifact';
export type SlipStatus = 'open' | 'won' | 'lost' | 'pushed' | 'cashed_out' | 'partial' | 'unknown';
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
  raw_extracted_text: string | null;
  raw_parse_json: Record<string, unknown> | null;
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
  raw_source_reference: string | null;
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
