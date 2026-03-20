import { describe, expect, it } from 'vitest';

import { computeBettorMemoryCredibility, labelCredibilityBucket } from '../credibility';
import type { BettorMemorySnapshot } from '../types';

const baseSnapshot = (): BettorMemorySnapshot => ({
  profile: {
    bettor_id: 'bettor-1',
    username: 'bettor',
    display_name: 'Bettor',
    timezone: 'UTC',
    preferred_sportsbooks: ['FanDuel'],
    bettor_identity: 'selective_striker',
    advisory_signals: [],
    historical_aggregates: {},
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-20T00:00:00.000Z',
  },
  artifacts: [
    { artifact_id: 'a1', bettor_id: 'bettor-1', storage_path: 'a1', object_url: null, artifact_type: 'slip_screenshot', source_sportsbook: 'FanDuel', upload_timestamp: '2026-03-01T00:00:00.000Z', parse_status: 'parsed', parser_version: '1', confidence_score: 0.9, verification_status: 'verified', data_source: 'bettor_verified', raw_extracted_text: null, raw_parse_json: null, preview_metadata: { width: null, height: null, mime_type: null, size_bytes: null } },
    { artifact_id: 'a2', bettor_id: 'bettor-1', storage_path: 'a2', object_url: null, artifact_type: 'slip_screenshot', source_sportsbook: 'FanDuel', upload_timestamp: '2026-03-02T00:00:00.000Z', parse_status: 'partial', parser_version: '1', confidence_score: 0.6, verification_status: 'needs_review', data_source: 'parser_output', raw_extracted_text: null, raw_parse_json: null, preview_metadata: { width: null, height: null, mime_type: null, size_bytes: null } },
    { artifact_id: 'a3', bettor_id: 'bettor-1', storage_path: 'a3', object_url: null, artifact_type: 'slip_screenshot', source_sportsbook: 'FanDuel', upload_timestamp: '2026-03-03T00:00:00.000Z', parse_status: 'failed', parser_version: '1', confidence_score: null, verification_status: 'uploaded', data_source: 'raw_upload', raw_extracted_text: null, raw_parse_json: null, preview_metadata: { width: null, height: null, mime_type: null, size_bytes: null } },
    { artifact_id: 'a4', bettor_id: 'bettor-1', storage_path: 'a4', object_url: null, artifact_type: 'slip_screenshot', source_sportsbook: 'DraftKings', upload_timestamp: '2026-03-04T00:00:00.000Z', parse_status: 'parsed', parser_version: '1', confidence_score: 0.5, verification_status: 'parsed_demo', data_source: 'demo_parse', raw_extracted_text: null, raw_parse_json: { explicit_demo: true }, preview_metadata: { width: null, height: null, mime_type: null, size_bytes: null } },
  ],
  slips: [
    { slip_id: 's1', bettor_id: 'bettor-1', source_artifact_id: 'a1', sportsbook: 'FanDuel', placed_at: '2026-03-01T00:00:00.000Z', settled_at: '2026-03-01T01:00:00.000Z', stake: 20, payout: 38, potential_payout: 38, odds: 190, status: 'won', leg_count: 1, sport: 'Basketball', league: 'NBA', confidence_score: 0.9, parse_quality: 'parsed', verification_status: 'verified', data_source: 'bettor_verified', raw_source_reference: null, parse_snapshot_json: null, verified_snapshot_json: null, last_reviewed_at: '2026-03-01T02:00:00.000Z', created_at: '2026-03-01T00:00:00.000Z', updated_at: '2026-03-01T02:00:00.000Z', legs: [{ leg_id: 'l1', slip_id: 's1', player_name: 'Player 1', team_name: 'A', market_type: 'Points', line: 20.5, over_under_or_side: 'over', odds: -110, result: 'won', event_descriptor: 'A vs B', sport: 'Basketball', league: 'NBA', confidence_score: 0.9, verification_status: 'verified', normalized_market_label: 'Points', data_source: 'bettor_verified' }] },
    { slip_id: 's2', bettor_id: 'bettor-1', source_artifact_id: 'a2', sportsbook: 'FanDuel', placed_at: '2026-03-02T00:00:00.000Z', settled_at: '2026-03-02T01:00:00.000Z', stake: 10, payout: 0, potential_payout: 30, odds: 200, status: 'lost', leg_count: 1, sport: 'Basketball', league: 'NBA', confidence_score: 0.6, parse_quality: 'partial', verification_status: 'needs_review', data_source: 'parser_output', raw_source_reference: null, parse_snapshot_json: null, verified_snapshot_json: null, last_reviewed_at: null, created_at: '2026-03-02T00:00:00.000Z', updated_at: '2026-03-02T01:00:00.000Z', legs: [{ leg_id: 'l2', slip_id: 's2', player_name: 'Player 2', team_name: 'B', market_type: 'Points', line: 10.5, over_under_or_side: 'under', odds: -110, result: 'lost', event_descriptor: 'B vs C', sport: 'Basketball', league: 'NBA', confidence_score: 0.6, verification_status: 'needs_review', normalized_market_label: 'Points', data_source: 'parser_output' }] },
    { slip_id: 's3', bettor_id: 'bettor-1', source_artifact_id: 'a4', sportsbook: 'DraftKings', placed_at: '2026-03-04T00:00:00.000Z', settled_at: '2026-03-04T01:00:00.000Z', stake: 5, payout: 0, potential_payout: 15, odds: 200, status: 'lost', leg_count: 1, sport: 'Basketball', league: 'NBA', confidence_score: 0.5, parse_quality: 'parsed', verification_status: 'parsed_demo', data_source: 'demo_parse', raw_source_reference: null, parse_snapshot_json: { explicit_demo: true }, verified_snapshot_json: null, last_reviewed_at: null, created_at: '2026-03-04T00:00:00.000Z', updated_at: '2026-03-04T01:00:00.000Z', legs: [{ leg_id: 'l3', slip_id: 's3', player_name: 'Player 3', team_name: 'C', market_type: 'Assists', line: 5.5, over_under_or_side: 'over', odds: 120, result: 'lost', event_descriptor: 'C vs D', sport: 'Basketball', league: 'NBA', confidence_score: 0.5, verification_status: 'parsed_demo', normalized_market_label: 'Assists', data_source: 'demo_parse' }] },
    { slip_id: 's1-dup', bettor_id: 'bettor-1', source_artifact_id: 'a1', sportsbook: 'FanDuel', placed_at: '2026-03-01T00:00:00.000Z', settled_at: '2026-03-01T01:00:00.000Z', stake: 20, payout: 0, potential_payout: 38, odds: 190, status: 'lost', leg_count: 1, sport: 'Basketball', league: 'NBA', confidence_score: 0.2, parse_quality: 'partial', verification_status: 'parsed_unverified', data_source: 'parser_output', raw_source_reference: null, parse_snapshot_json: null, verified_snapshot_json: null, last_reviewed_at: null, created_at: '2026-03-01T00:00:00.000Z', updated_at: '2026-03-01T01:00:00.000Z', legs: [] },
  ],
  accountActivity: [],
  postmortems: [
    { postmortem_id: 'pm-1', bettor_id: 'bettor-1', slip_id: 's1', outcome_summary: 'win', weakest_leg_candidates: [], strongest_legs: [], correlated_risk_notes: [], market_concentration_notes: [], slip_size_notes: [], confidence_score: 0.9, evidence: [{ basis: 'verified_history', note: 'verified' }], advisory_tags: [], created_at: '2026-03-01T02:00:00.000Z' },
    { postmortem_id: 'pm-2', bettor_id: 'bettor-1', slip_id: 's2', outcome_summary: 'loss', weakest_leg_candidates: [], strongest_legs: [], correlated_risk_notes: [], market_concentration_notes: [], slip_size_notes: [], confidence_score: 0.6, evidence: [{ basis: 'unverified_parse', note: 'parser' }], advisory_tags: [], created_at: '2026-03-02T02:00:00.000Z' },
  ],
  mode: 'live',
  credibility: { basis: 'partial_data', label: 'Partial verified coverage', detail: 'placeholder' },
  coverage: {} as BettorMemorySnapshot['coverage'],
});

describe('bettor memory credibility', () => {
  it('computes deterministic coverage without double-counting preferred records', () => {
    const coverage = computeBettorMemoryCredibility(baseSnapshot());

    expect(coverage.parsedSlips.total).toBe(3);
    expect(coverage.parsedSlips.verified.count).toBe(1);
    expect(coverage.parsedSlips.parserDerived.count).toBe(1);
    expect(coverage.parsedSlips.demoFallback.count).toBe(1);
    expect(coverage.overall.parseFailedOrMissing.count).toBe(1);
    expect(coverage.postmortems.verified.count).toBe(1);
  });

  it('creates review guidance and profile/postmortem labels conservatively', () => {
    const coverage = computeBettorMemoryCredibility(baseSnapshot());

    expect(coverage.labels.profile.label).toBe('Review-heavy');
    expect(coverage.labels.postmortem.label).toBe('Review-heavy');
    expect(coverage.reviewNext.map((item) => item.code)).toEqual(expect.arrayContaining(['settled_slips_need_review', 'parse_failures_present', 'market_parser_derived', 'postmortem_limited']));
    expect(labelCredibilityBucket('demo_fallback_heavy')).toBe('Demo/fallback heavy');
  });
});
