import type { BettorMemorySnapshot, BettorPostmortemRecord, DataSourceProvenance, VerificationStatus } from './types';
import { preferVerifiedRecords } from './review';

export type CredibilityBucket = 'mostly_verified' | 'mixed_coverage' | 'review_heavy' | 'parser_limited' | 'demo_fallback_heavy';
export type CredibilitySurface = 'profile' | 'history' | 'postmortem' | 'analytics';
export type CoverageScope = 'artifacts' | 'parsed_slips' | 'settled_slips' | 'account_activity_imports' | 'postmortems' | 'profile_metrics_inputs';
export type SourceQualityBasis = 'verified_records' | 'parser_records' | 'demo_records' | 'missing_records' | 'mixed_records' | 'partial_records';

export type CoverageSlice = {
  count: number;
  percent: number;
  partial: boolean;
  label: string;
};

export type CoverageBreakdown = {
  scope: CoverageScope;
  total: number;
  verified: CoverageSlice;
  parserDerived: CoverageSlice;
  demoFallback: CoverageSlice;
  reviewNeeded: CoverageSlice;
  parseFailedOrMissing: CoverageSlice;
  partialCoverage: boolean;
};

export type SourceQualityMix = {
  totalInputs: number;
  verifiedInputs: number;
  parserDerivedInputs: number;
  demoFallbackInputs: number;
  missingInputs: number;
  partialInputs: number;
  verifiedPercent: number;
  parserDerivedPercent: number;
  demoFallbackPercent: number;
  missingPercent: number;
  partialPercent: number;
  basis: SourceQualityBasis;
  label: string;
  detail: string;
};

export type SurfaceCredibilityLabel = {
  surface: CredibilitySurface;
  bucket: CredibilityBucket;
  label: string;
  detail: string;
  verifiedPercent: number;
  partial: boolean;
};

export type ReviewNextGuidance = {
  code:
    | 'settled_slips_need_review'
    | 'recent_slips_unverified'
    | 'parse_failures_present'
    | 'demo_artifacts_present'
    | 'profile_mostly_verified'
    | 'postmortem_limited'
    | 'market_parser_derived';
  label: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
};

export type BettorMemoryCredibilitySummary = {
  overall: CoverageBreakdown;
  parsedSlips: CoverageBreakdown;
  settledSlips: CoverageBreakdown;
  accountActivityImports: CoverageBreakdown;
  postmortems: CoverageBreakdown;
  profileMetricsInputs: CoverageBreakdown;
  analyticsSourceQuality: SourceQualityMix;
  postmortemSourceQuality: SourceQualityMix;
  labels: Record<CredibilitySurface, SurfaceCredibilityLabel>;
  reviewNext: ReviewNextGuidance[];
  counts: {
    artifacts: number;
    parsedSlips: number;
    settledSlips: number;
    accountActivityImports: number;
    postmortems: number;
    verifiedArtifacts: number;
    verifiedSlips: number;
    verifiedSettledSlips: number;
    reviewNeededArtifacts: number;
    parserDerivedSlips: number;
    demoFallbackArtifacts: number;
    parseFailedArtifacts: number;
  };
  thresholds: {
    mostlyVerifiedMinPct: number;
    mixedCoverageMinPct: number;
    reviewHeavyMinPct: number;
    demoFallbackHeavyMinPct: number;
    parserLimitedMaxVerifiedPct: number;
  };
};

const CREDIBILITY_THRESHOLDS = {
  mostlyVerifiedMinPct: 80,
  mixedCoverageMinPct: 45,
  reviewHeavyMinPct: 35,
  demoFallbackHeavyMinPct: 40,
  parserLimitedMaxVerifiedPct: 20,
} as const;

const SETTLED_STATUSES = new Set(['won', 'lost', 'pushed', 'cashed_out', 'partial']);
const REVIEW_NEEDED_STATUSES = new Set<VerificationStatus>(['uploaded', 'parse_pending', 'parsed_unverified', 'needs_review', 'parsed_demo', 'unverified']);
const PARSER_DERIVED_SOURCES = new Set<DataSourceProvenance>(['parser_output']);
const DEMO_SOURCES = new Set<DataSourceProvenance>(['demo_parse']);
const FAILED_PARSE = new Set(['failed']);
const PARTIAL_PARSE = new Set(['partial']);

const roundPct = (value: number) => Number(value.toFixed(1));
const pct = (count: number, total: number) => (total > 0 ? roundPct((count / total) * 100) : 0);
const toSlice = (count: number, total: number, partial: boolean, label: string): CoverageSlice => ({ count, percent: pct(count, total), partial, label });

function isReviewNeeded(status: VerificationStatus) {
  return REVIEW_NEEDED_STATUSES.has(status);
}

function isParserDerived(record: { verification_status: VerificationStatus; data_source?: DataSourceProvenance | undefined }) {
  return PARSER_DERIVED_SOURCES.has(record.data_source ?? 'parser_output') && record.verification_status !== 'verified';
}

function isDemo(record: { data_source?: DataSourceProvenance | undefined; verification_status: VerificationStatus }) {
  return DEMO_SOURCES.has(record.data_source ?? 'raw_upload') || record.verification_status === 'parsed_demo';
}

function readParseState(record: { parse_status?: string | undefined; parse_quality?: string | undefined }) {
  return record.parse_status ?? record.parse_quality ?? '';
}

function isParseFailed(record: { parse_status?: string | undefined; parse_quality?: string | undefined; verification_status: VerificationStatus; data_source?: DataSourceProvenance | undefined }) {
  return FAILED_PARSE.has(readParseState(record)) || (record.verification_status === 'uploaded' && (record.data_source ?? 'raw_upload') === 'raw_upload');
}

function isPartialRecord(record: { parse_status?: string | undefined; parse_quality?: string | undefined }) {
  return PARTIAL_PARSE.has(readParseState(record));
}

function buildCoverageBreakdown<T extends { verification_status: VerificationStatus; data_source?: DataSourceProvenance | undefined; parse_status?: string | undefined; parse_quality?: string | undefined }>(scope: CoverageScope, records: T[]): CoverageBreakdown {
  const total = records.length;
  const verifiedCount = records.filter((record) => record.verification_status === 'verified').length;
  const demoCount = records.filter((record) => isDemo(record)).length;
  const parseFailedCount = records.filter((record) => isParseFailed(record)).length;
  const reviewNeededCount = records.filter((record) => isReviewNeeded(record.verification_status) || isPartialRecord(record)).length;
  const parserDerivedCount = records.filter((record) => isParserDerived(record)).length;
  const partialCoverage = records.some((record) => isPartialRecord(record));
  return {
    scope,
    total,
    verified: toSlice(verifiedCount, total, partialCoverage && verifiedCount > 0, 'Verified'),
    parserDerived: toSlice(parserDerivedCount, total, partialCoverage && parserDerivedCount > 0, 'Parser-derived'),
    demoFallback: toSlice(demoCount, total, partialCoverage && demoCount > 0, 'Demo/fallback'),
    reviewNeeded: toSlice(reviewNeededCount, total, partialCoverage && reviewNeededCount > 0, 'Needs review'),
    parseFailedOrMissing: toSlice(parseFailedCount, total, partialCoverage && parseFailedCount > 0, 'Parse failed/missing'),
    partialCoverage,
  };
}

function determineBucket(input: { verifiedPercent: number; demoPercent: number; reviewNeededPercent: number; parseFailedPercent: number }): CredibilityBucket {
  if (input.demoPercent >= CREDIBILITY_THRESHOLDS.demoFallbackHeavyMinPct) return 'demo_fallback_heavy';
  if (input.verifiedPercent >= CREDIBILITY_THRESHOLDS.mostlyVerifiedMinPct) return 'mostly_verified';
  if (input.verifiedPercent <= CREDIBILITY_THRESHOLDS.parserLimitedMaxVerifiedPct && (input.parseFailedPercent > 0 || input.reviewNeededPercent >= CREDIBILITY_THRESHOLDS.reviewHeavyMinPct)) return 'parser_limited';
  if (input.reviewNeededPercent >= CREDIBILITY_THRESHOLDS.reviewHeavyMinPct) return 'review_heavy';
  return 'mixed_coverage';
}

export function labelCredibilityBucket(bucket: CredibilityBucket): string {
  switch (bucket) {
    case 'mostly_verified': return 'Mostly verified';
    case 'mixed_coverage': return 'Mixed coverage';
    case 'review_heavy': return 'Review-heavy';
    case 'parser_limited': return 'Parser-limited';
    case 'demo_fallback_heavy': return 'Demo/fallback heavy';
  }
}

function buildSurfaceLabel(surface: CredibilitySurface, coverage: CoverageBreakdown): SurfaceCredibilityLabel {
  const bucket = determineBucket({
    verifiedPercent: coverage.verified.percent,
    demoPercent: coverage.demoFallback.percent,
    reviewNeededPercent: coverage.reviewNeeded.percent,
    parseFailedPercent: coverage.parseFailedOrMissing.percent,
  });
  const label = labelCredibilityBucket(bucket);
  const detailMap: Record<CredibilityBucket, string> = {
    mostly_verified: `${surface === 'postmortem' ? 'Post-mortem signals' : 'This surface'} is based mostly on verified records.`,
    mixed_coverage: `${surface === 'postmortem' ? 'Post-mortem signals' : 'This surface'} mixes verified and parser-derived records.`,
    review_heavy: `${surface === 'postmortem' ? 'Post-mortem signals' : 'This surface'} still leans on records that need bettor review.`,
    parser_limited: `${surface === 'postmortem' ? 'Post-mortem signals' : 'This surface'} is limited by parser-derived or failed records.`,
    demo_fallback_heavy: `${surface === 'postmortem' ? 'Post-mortem signals' : 'This surface'} is dominated by demo/fallback records.`,
  };
  return { surface, bucket, label, detail: detailMap[bucket], verifiedPercent: coverage.verified.percent, partial: coverage.partialCoverage };
}

function buildSourceQualityMix(input: { totalInputs: number; verifiedInputs: number; parserDerivedInputs: number; demoFallbackInputs: number; missingInputs: number; partialInputs: number; surface: 'analytics' | 'postmortem' }): SourceQualityMix {
  const { totalInputs, verifiedInputs, parserDerivedInputs, demoFallbackInputs, missingInputs, partialInputs } = input;
  const verifiedPercent = pct(verifiedInputs, totalInputs);
  const parserDerivedPercent = pct(parserDerivedInputs, totalInputs);
  const demoFallbackPercent = pct(demoFallbackInputs, totalInputs);
  const missingPercent = pct(missingInputs, totalInputs);
  const partialPercent = pct(partialInputs, totalInputs);
  let basis: SourceQualityBasis = 'mixed_records';
  if (totalInputs === 0) basis = 'missing_records';
  else if (verifiedPercent >= CREDIBILITY_THRESHOLDS.mostlyVerifiedMinPct) basis = 'verified_records';
  else if (demoFallbackPercent >= CREDIBILITY_THRESHOLDS.demoFallbackHeavyMinPct) basis = 'demo_records';
  else if (verifiedPercent <= CREDIBILITY_THRESHOLDS.parserLimitedMaxVerifiedPct && (parserDerivedPercent > 0 || missingPercent > 0)) basis = 'parser_records';
  else if (partialPercent > 0 || missingPercent > 0) basis = 'partial_records';
  const labelMap: Record<SourceQualityBasis, string> = {
    verified_records: 'Mostly verified',
    parser_records: 'Parser-limited',
    demo_records: 'Demo/fallback heavy',
    missing_records: 'Partial coverage',
    mixed_records: 'Mixed coverage',
    partial_records: 'Partial coverage',
  };
  const subject = input.surface === 'postmortem' ? 'Post-mortem signals' : 'Profile analytics';
  const detailMap: Record<SourceQualityBasis, string> = {
    verified_records: `${subject} are based primarily on verified records.`,
    parser_records: `${subject} are limited by parser-derived history.`,
    demo_records: `${subject} rely heavily on demo or fallback records.`,
    missing_records: `${subject} have limited input coverage right now.`,
    mixed_records: `${subject} use a mix of verified and parser-derived records.`,
    partial_records: `${subject} have partial coverage because some inputs are incomplete or missing.`,
  };
  return { totalInputs, verifiedInputs, parserDerivedInputs, demoFallbackInputs, missingInputs, partialInputs, verifiedPercent, parserDerivedPercent, demoFallbackPercent, missingPercent, partialPercent, basis, label: labelMap[basis], detail: detailMap[basis] };
}

function computePostmortemCoverage(postmortems: BettorPostmortemRecord[]) {
  const total = postmortems.length;
  const verifiedCount = postmortems.filter((item) => item.evidence.some((entry) => entry.basis === 'verified_history')).length;
  const parserCount = postmortems.filter((item) => item.evidence.some((entry) => entry.basis === 'unverified_parse')).length;
  const demoCount = postmortems.filter((item) => item.evidence.some((entry) => entry.basis === 'demo_inference')).length;
  return {
    scope: 'postmortems' as const,
    total,
    verified: toSlice(verifiedCount, total, false, 'Verified'),
    parserDerived: toSlice(parserCount, total, false, 'Parser-derived'),
    demoFallback: toSlice(demoCount, total, false, 'Demo/fallback'),
    reviewNeeded: toSlice(parserCount + demoCount, total, false, 'Needs review'),
    parseFailedOrMissing: toSlice(0, total, false, 'Parse failed/missing'),
    partialCoverage: false,
  };
}

export function computeBettorMemoryCredibility(snapshot: BettorMemorySnapshot): BettorMemoryCredibilitySummary {
  const preferredSlips = preferVerifiedRecords(snapshot.slips);
  const settledSlips = preferredSlips.filter((slip) => SETTLED_STATUSES.has(slip.status));
  const activity = preferVerifiedRecords(snapshot.accountActivity);
  const overall = buildCoverageBreakdown('artifacts', snapshot.artifacts);
  const parsedSlips = buildCoverageBreakdown('parsed_slips', preferredSlips);
  const settled = buildCoverageBreakdown('settled_slips', settledSlips);
  const accountActivityImports = buildCoverageBreakdown('account_activity_imports', activity);
  const postmortemCoverage = computePostmortemCoverage(snapshot.postmortems);
  const profileMetricsInputs = buildCoverageBreakdown('profile_metrics_inputs', settledSlips);
  const analyticsSourceQuality = buildSourceQualityMix({
    totalInputs: settledSlips.length,
    verifiedInputs: settledSlips.filter((slip) => slip.verification_status === 'verified').length,
    parserDerivedInputs: settledSlips.filter((slip) => isParserDerived(slip)).length,
    demoFallbackInputs: settledSlips.filter((slip) => isDemo(slip)).length,
    missingInputs: snapshot.artifacts.filter((artifact) => isParseFailed(artifact)).length,
    partialInputs: settledSlips.filter((slip) => isPartialRecord(slip)).length,
    surface: 'analytics',
  });
  const postmortemSourceQuality = buildSourceQualityMix({
    totalInputs: settledSlips.length,
    verifiedInputs: settled.verified.count,
    parserDerivedInputs: settled.parserDerived.count,
    demoFallbackInputs: settled.demoFallback.count,
    missingInputs: settled.parseFailedOrMissing.count,
    partialInputs: settled.partialCoverage ? settled.reviewNeeded.count : 0,
    surface: 'postmortem',
  });

  const labels = {
    profile: buildSurfaceLabel('profile', profileMetricsInputs),
    history: buildSurfaceLabel('history', overall),
    postmortem: buildSurfaceLabel('postmortem', settled),
    analytics: buildSurfaceLabel('analytics', profileMetricsInputs),
  };

  const reviewNext: ReviewNextGuidance[] = [];
  if (settled.reviewNeeded.count > 0) {
    reviewNext.push({ code: 'settled_slips_need_review', label: `Review ${settled.reviewNeeded.count} settled slip${settled.reviewNeeded.count === 1 ? '' : 's'} to strengthen post-mortem signals`, detail: 'Settled slips directly improve post-mortem coverage once bettor-reviewed.', priority: 'high' });
  }
  const recentUnverified = preferredSlips.slice(0, 5).filter((slip) => slip.verification_status !== 'verified').length;
  if (recentUnverified > 0) {
    reviewNext.push({ code: 'recent_slips_unverified', label: `${recentUnverified} recent slip${recentUnverified === 1 ? '' : 's'} are still unverified`, detail: 'Recent parsed history is visible, but bettor review is still pending.', priority: 'medium' });
  }
  if (overall.parseFailedOrMissing.count > 0) {
    reviewNext.push({ code: 'parse_failures_present', label: `${overall.parseFailedOrMissing.count} artifact${overall.parseFailedOrMissing.count === 1 ? '' : 's'} failed parsing`, detail: 'These uploads are blocking fuller history coverage until manually reviewed or re-uploaded.', priority: 'high' });
  }
  if (overall.demoFallback.count > 0) {
    reviewNext.push({ code: 'demo_artifacts_present', label: `${overall.demoFallback.count} artifact${overall.demoFallback.count === 1 ? '' : 's'} still use demo/fallback parsing`, detail: 'Demo/fallback records stay explicit until bettor-reviewed.', priority: 'medium' });
  }
  const pointsUnverified = preferredSlips.filter((slip) => slip.legs.some((leg) => /points/i.test(leg.normalized_market_label ?? leg.market_type ?? '')) && slip.verification_status !== 'verified').length;
  if (pointsUnverified > 0) {
    reviewNext.push({ code: 'market_parser_derived', label: 'Most points-prop history is still parser-derived', detail: `${pointsUnverified} tracked points-market slip${pointsUnverified === 1 ? '' : 's'} still need bettor review.`, priority: 'medium' });
  }
  if (analyticsSourceQuality.basis === 'verified_records') {
    reviewNext.push({ code: 'profile_mostly_verified', label: 'Profile ROI is based mostly on verified records', detail: 'Performance metrics are already leaning on bettor-confirmed history.', priority: 'low' });
  }
  if (postmortemSourceQuality.basis !== 'verified_records') {
    reviewNext.push({ code: 'postmortem_limited', label: 'Post-mortem signals are limited by partial review coverage', detail: 'Verified settled history will make the weakest-leg and pattern notes more reliable.', priority: 'high' });
  }

  return {
    overall,
    parsedSlips,
    settledSlips: settled,
    accountActivityImports,
    postmortems: postmortemCoverage,
    profileMetricsInputs,
    analyticsSourceQuality,
    postmortemSourceQuality,
    labels,
    reviewNext,
    counts: {
      artifacts: snapshot.artifacts.length,
      parsedSlips: preferredSlips.length,
      settledSlips: settledSlips.length,
      accountActivityImports: activity.length,
      postmortems: snapshot.postmortems.length,
      verifiedArtifacts: overall.verified.count,
      verifiedSlips: parsedSlips.verified.count,
      verifiedSettledSlips: settled.verified.count,
      reviewNeededArtifacts: overall.reviewNeeded.count,
      parserDerivedSlips: parsedSlips.parserDerived.count,
      demoFallbackArtifacts: overall.demoFallback.count,
      parseFailedArtifacts: overall.parseFailedOrMissing.count,
    },
    thresholds: { ...CREDIBILITY_THRESHOLDS },
  };
}
