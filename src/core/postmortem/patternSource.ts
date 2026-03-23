import type { ReviewPostMortemResult, ReviewProvenance } from '@/src/core/control/reviewIngestion';
import {
  summarizeBettorMistakePatterns,
  toReviewedAttributionRecord,
  type BettorMistakePatternSummary,
  type ReviewedAttributionRecord
} from '@/src/core/postmortem/patterns';
import {
  buildDraftLearningAdvisory,
  extractLearningArtifactFromPostmortem,
  extractLearningArtifactFromReviewedRecord,
  type DraftLearningAdvisory,
  type SettledLearningArtifact
} from '@/src/core/postmortem/learning';
import { listPostmortems } from '@/src/core/review/store';
import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

const REVIEWED_ATTRIBUTIONS_KEY = 'rb:reviewed-attributions:v1';
const MAX_RECORDS = 100;

function readJson<T>(fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(REVIEWED_ATTRIBUTIONS_KEY);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(records: ReviewedAttributionRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REVIEWED_ATTRIBUTIONS_KEY, JSON.stringify(records));
}

export function listReviewedAttributions(): ReviewedAttributionRecord[] {
  return readJson<ReviewedAttributionRecord[]>([])
    .filter((record) => Array.isArray(record.cause_tags))
    .sort((a, b) => Date.parse(b.reviewed_at) - Date.parse(a.reviewed_at));
}

export function saveReviewedAttribution(input: {
  postmortem: ReviewPostMortemResult;
  provenance: ReviewProvenance;
  reviewed_at?: string;
}): ReviewedAttributionRecord | null {
  const record = toReviewedAttributionRecord(input);
  if (!record) return null;

  const existing = listReviewedAttributions();
  const deduped = [
    record,
    ...existing.filter(
      (item) => item.trace_id !== record.trace_id || item.slip_id !== record.slip_id
    )
  ].slice(0, MAX_RECORDS);
  writeJson(deduped);
  return record;
}

export function getBettorMistakePatternSummary(): BettorMistakePatternSummary {
  return summarizeBettorMistakePatterns(listReviewedAttributions());
}

export function listLearningArtifacts(): SettledLearningArtifact[] {
  const reviewedArtifacts = listReviewedAttributions().map(
    extractLearningArtifactFromReviewedRecord
  );
  const settledArtifacts = listPostmortems().map(extractLearningArtifactFromPostmortem);

  return [...reviewedArtifacts, ...settledArtifacts].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  );
}

export function getDraftLearningAdvisory(slip: SlipBuilderLeg[]): DraftLearningAdvisory | null {
  return buildDraftLearningAdvisory(listLearningArtifacts(), slip);
}
