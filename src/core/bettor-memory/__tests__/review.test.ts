import { describe, expect, it } from 'vitest';

import { buildDemoBettorMemory } from '../demo';
import { computePerformanceSummary, summarizeCredibility } from '../analytics';
import { buildAccountActivityReviewFields, buildSlipLegReviewFields, buildSlipReviewFields, deriveDataSourceProvenance, deriveParserConfidenceLabel, deriveVerificationStatus, preferVerifiedRecords } from '../review';

describe('bettor memory review contracts', () => {
  it('models verification lifecycle transitions explicitly', () => {
    expect(deriveVerificationStatus({ hasParse: false, isDemo: false, parserConfidence: null, hasHumanReview: false })).toBe('uploaded');
    expect(deriveVerificationStatus({ hasParse: false, isDemo: false, parserConfidence: null, hasHumanReview: true })).toBe('parse_pending');
    expect(deriveVerificationStatus({ hasParse: true, isDemo: true, parserConfidence: 0.44, hasHumanReview: false })).toBe('parsed_demo');
    expect(deriveVerificationStatus({ hasParse: true, isDemo: false, parserConfidence: 0.91, hasHumanReview: false })).toBe('parsed_unverified');
    expect(deriveVerificationStatus({ hasParse: true, isDemo: false, parserConfidence: 0.33, hasHumanReview: false })).toBe('needs_review');
    expect(deriveVerificationStatus({ hasParse: true, isDemo: false, parserConfidence: 0.33, hasHumanReview: true, verified: true })).toBe('verified');
    expect(deriveVerificationStatus({ hasParse: true, isDemo: false, parserConfidence: 0.33, hasHumanReview: true, rejected: true })).toBe('rejected');
  });

  it('keeps provenance separate from verification state', () => {
    expect(deriveDataSourceProvenance('uploaded', false)).toBe('raw_upload');
    expect(deriveDataSourceProvenance('parsed_demo', true)).toBe('demo_parse');
    expect(deriveDataSourceProvenance('needs_review', false)).toBe('parser_output');
    expect(deriveDataSourceProvenance('verified', false)).toBe('bettor_verified');
    expect(deriveParserConfidenceLabel(0.91)).toBe('high');
    expect(deriveParserConfidenceLabel(0.7)).toBe('medium');
    expect(deriveParserConfidenceLabel(0.2)).toBe('low');
  });

  it('prefers verified records over review-needed records for analytics', () => {
    const [first] = buildDemoBettorMemory().slips;
    const verified = { ...first!, payout: 77, verification_status: 'verified' as const, updated_at: '2026-03-02T00:00:00.000Z' };
    const unverified = { ...first!, payout: 62.5, verification_status: 'needs_review' as const, updated_at: '2026-03-01T00:00:00.000Z' };
    const selected = preferVerifiedRecords([unverified, verified]);
    expect(selected).toHaveLength(1);
    expect(selected[0]?.payout).toBe(77);
    expect(computePerformanceSummary([unverified, verified]).totalReturned).toBe(77);
  });

  it('builds field review metadata for sparse edits', () => {
    const snapshot = buildDemoBettorMemory();
    const slip = { ...snapshot.slips[0]!, payout: null };
    const leg = { ...slip.legs[0]!, player_name: null };
    const activity = { ...snapshot.accountActivity[0]!, deposited: null };
    expect(buildSlipReviewFields(slip).payout.state).toBe('unknown');
    expect(buildSlipLegReviewFields(leg).player_name.state).toBe('unknown');
    expect(buildAccountActivityReviewFields(activity).deposited.state).toBe('unknown');
  });

  it('labels mixed datasets conservatively', () => {
    const snapshot = buildDemoBettorMemory();
    const credibility = summarizeCredibility({
      ...snapshot,
      mode: 'live',
      artifacts: [
        { ...snapshot.artifacts[0]!, verification_status: 'verified', data_source: 'bettor_verified' },
        { ...snapshot.artifacts[1]!, verification_status: 'needs_review', data_source: 'demo_parse' },
      ],
    });
    expect(credibility.basis).toBe('partial_data');
    expect(credibility.label).toContain('Partial');
  });
});
