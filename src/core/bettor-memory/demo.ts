import { buildStoredPostmortems, classifyBettorIdentity, generateAdvisorySignals, summarizeCredibility } from './analytics';
import { computeBettorMemoryCredibility } from './credibility';
import type { BettorMemorySnapshot, ParsedSlipRecord } from './types';

const demoParseSnapshot = { source: 'demo', explicit_demo: true, uncertainty: 'Deterministic demo parse; bettor review required.' };

const demoSlips: ParsedSlipRecord[] = [
  {
    slip_id: 'demo-slip-1', bettor_id: 'demo-bettor', source_artifact_id: 'demo-artifact-1', sportsbook: 'FanDuel', placed_at: '2026-03-01T19:00:00.000Z', settled_at: '2026-03-01T23:30:00.000Z', stake: 25, payout: 62.5, potential_payout: 62.5, odds: 150, status: 'won', leg_count: 2, sport: 'Basketball', league: 'NBA', confidence_score: 0.76, parse_quality: 'partial', verification_status: 'needs_review', data_source: 'demo_parse', raw_source_reference: 'demo_upload_1', parse_snapshot_json: demoParseSnapshot, verified_snapshot_json: null, last_reviewed_at: null, created_at: '2026-03-01T19:00:00.000Z', updated_at: '2026-03-01T23:30:00.000Z',
    legs: [
      { leg_id: 'demo-leg-1', slip_id: 'demo-slip-1', player_name: 'Jayson Tatum', team_name: 'BOS', market_type: 'Points', line: 28.5, over_under_or_side: 'over', odds: -110, result: 'won', event_descriptor: 'BOS vs NYK', sport: 'Basketball', league: 'NBA', confidence_score: 0.75, verification_status: 'needs_review', normalized_market_label: 'Points', data_source: 'demo_parse', parse_snapshot_json: demoParseSnapshot, verified_snapshot_json: null, last_reviewed_at: null },
      { leg_id: 'demo-leg-2', slip_id: 'demo-slip-1', player_name: 'Josh Hart', team_name: 'NYK', market_type: 'Rebounds', line: 8.5, over_under_or_side: 'over', odds: -105, result: 'won', event_descriptor: 'BOS vs NYK', sport: 'Basketball', league: 'NBA', confidence_score: 0.72, verification_status: 'needs_review', normalized_market_label: 'Rebounds', data_source: 'demo_parse', parse_snapshot_json: demoParseSnapshot, verified_snapshot_json: null, last_reviewed_at: null },
    ]
  },
  {
    slip_id: 'demo-slip-2', bettor_id: 'demo-bettor', source_artifact_id: 'demo-artifact-2', sportsbook: 'DraftKings', placed_at: '2026-03-05T19:00:00.000Z', settled_at: '2026-03-05T23:50:00.000Z', stake: 40, payout: 0, potential_payout: 230, odds: 475, status: 'lost', leg_count: 4, sport: 'Basketball', league: 'NBA', confidence_score: 0.64, parse_quality: 'partial', verification_status: 'parsed_unverified', data_source: 'demo_parse', raw_source_reference: 'demo_upload_2', parse_snapshot_json: demoParseSnapshot, verified_snapshot_json: null, last_reviewed_at: null, created_at: '2026-03-05T19:00:00.000Z', updated_at: '2026-03-05T23:50:00.000Z',
    legs: [
      { leg_id: 'demo-leg-3', slip_id: 'demo-slip-2', player_name: 'Stephen Curry', team_name: 'GSW', market_type: '3PM', line: 5.5, over_under_or_side: 'over', odds: 120, result: 'won', event_descriptor: 'GSW vs LAL', sport: 'Basketball', league: 'NBA', confidence_score: 0.66, verification_status: 'parsed_unverified', normalized_market_label: '3PM', data_source: 'demo_parse', parse_snapshot_json: demoParseSnapshot, verified_snapshot_json: null, last_reviewed_at: null },
      { leg_id: 'demo-leg-4', slip_id: 'demo-slip-2', player_name: 'LeBron James', team_name: 'LAL', market_type: 'Alt Points Ladder', line: 34.5, over_under_or_side: 'over', odds: 180, result: 'lost', event_descriptor: 'GSW vs LAL', sport: 'Basketball', league: 'NBA', confidence_score: 0.58, verification_status: 'parsed_unverified', normalized_market_label: 'Alt Points Ladder', data_source: 'demo_parse', parse_snapshot_json: demoParseSnapshot, verified_snapshot_json: null, last_reviewed_at: null },
      { leg_id: 'demo-leg-5', slip_id: 'demo-slip-2', player_name: 'Anthony Davis', team_name: 'LAL', market_type: 'Rebounds', line: 13.5, over_under_or_side: 'over', odds: -110, result: 'won', event_descriptor: 'GSW vs LAL', sport: 'Basketball', league: 'NBA', confidence_score: 0.62, verification_status: 'parsed_unverified', normalized_market_label: 'Rebounds', data_source: 'demo_parse', parse_snapshot_json: demoParseSnapshot, verified_snapshot_json: null, last_reviewed_at: null },
      { leg_id: 'demo-leg-6', slip_id: 'demo-slip-2', player_name: 'Draymond Green', team_name: 'GSW', market_type: 'Assists', line: 7.5, over_under_or_side: 'over', odds: 100, result: 'lost', event_descriptor: 'GSW vs LAL', sport: 'Basketball', league: 'NBA', confidence_score: 0.57, verification_status: 'parsed_unverified', normalized_market_label: 'Assists', data_source: 'demo_parse', parse_snapshot_json: demoParseSnapshot, verified_snapshot_json: null, last_reviewed_at: null },
    ]
  }
];

export function buildDemoBettorMemory(): BettorMemorySnapshot {
  const profile = {
    bettor_id: 'demo-bettor', username: 'demo_bettor', display_name: 'Demo Bettor', timezone: 'America/New_York', preferred_sportsbooks: ['FanDuel', 'DraftKings'], bettor_identity: classifyBettorIdentity(demoSlips), advisory_signals: generateAdvisorySignals(demoSlips).map((signal) => signal.label), historical_aggregates: {}, created_at: '2026-03-01T00:00:00.000Z', updated_at: '2026-03-20T00:00:00.000Z'
  };
  const snapshot: BettorMemorySnapshot = {
    profile,
    artifacts: [
      { artifact_id: 'demo-artifact-1', bettor_id: 'demo-bettor', storage_path: 'demo/demo-artifact-1.png', object_url: null, artifact_type: 'slip_screenshot', source_sportsbook: 'FanDuel', upload_timestamp: '2026-03-01T19:00:00.000Z', parse_status: 'partial', parser_version: 'demo-parser-v1', confidence_score: 0.76, verification_status: 'needs_review', parser_confidence_label: 'medium', data_source: 'demo_parse', raw_extracted_text: 'Demo slip text', raw_parse_json: demoParseSnapshot, review_notes_json: null, last_reviewed_at: null, preview_metadata: { width: 1290, height: 2796, mime_type: 'image/png', size_bytes: 512000 } },
      { artifact_id: 'demo-artifact-2', bettor_id: 'demo-bettor', storage_path: 'demo/demo-artifact-2.png', object_url: null, artifact_type: 'slip_screenshot', source_sportsbook: 'DraftKings', upload_timestamp: '2026-03-05T19:00:00.000Z', parse_status: 'partial', parser_version: 'demo-parser-v1', confidence_score: 0.64, verification_status: 'parsed_demo', parser_confidence_label: 'medium', data_source: 'demo_parse', raw_extracted_text: 'Demo slip text', raw_parse_json: demoParseSnapshot, review_notes_json: null, last_reviewed_at: null, preview_metadata: { width: 1290, height: 2796, mime_type: 'image/png', size_bytes: 612000 } },
    ],
    slips: demoSlips,
    accountActivity: [
      { activity_import_id: 'demo-activity-1', bettor_id: 'demo-bettor', source_artifact_id: 'demo-artifact-2', source_sportsbook: 'DraftKings', beginning_balance: 500, end_balance: 522.5, deposited: 100, played_staked: 65, won_returned: 62.5, withdrawn: 0, rebated: 0, promotions_awarded: 10, promotions_played: 5, promotions_expired: 0, bets_placed: 2, bets_won: 1, activity_window_start: '2026-03-01T00:00:00.000Z', activity_window_end: '2026-03-07T00:00:00.000Z', verification_status: 'parsed_unverified', parse_quality: 'partial', confidence_score: 0.52, data_source: 'demo_parse', parse_snapshot_json: demoParseSnapshot, verified_snapshot_json: null, last_reviewed_at: null, created_at: '2026-03-07T00:00:00.000Z', updated_at: '2026-03-07T00:00:00.000Z' }
    ],
    postmortems: buildStoredPostmortems(demoSlips),
    mode: 'demo',
    credibility: { basis: 'demo_data', label: 'Demo data', detail: 'Deterministic demo records are shown until a bettor account saves verified uploads.' },
    coverage: {} as BettorMemorySnapshot['coverage']
  };
  snapshot.coverage = computeBettorMemoryCredibility(snapshot);
  snapshot.credibility = summarizeCredibility(snapshot);
  return snapshot;
}
