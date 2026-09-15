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
import { listPersistedPostmortems } from '@/src/core/review/store';
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

function dedupeLearningArtifacts(artifacts: SettledLearningArtifact[]): SettledLearningArtifact[] {
  const ordered = [...artifacts].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'reviewed_postmortem' ? -1 : 1;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
  const seenTraceIds = new Set<string>();
  const seenSlipIds = new Set<string>();
  const seenTicketIds = new Set<string>();
  const kept: SettledLearningArtifact[] = [];

  for (const artifact of ordered) {
    const duplicatesExisting =
      (artifact.trace_id ? seenTraceIds.has(artifact.trace_id) : false) ||
      (artifact.slip_id ? seenSlipIds.has(artifact.slip_id) : false) ||
      (artifact.ticket_id ? seenTicketIds.has(artifact.ticket_id) : false);
    if (duplicatesExisting) continue;

    kept.push(artifact);
    if (artifact.trace_id) seenTraceIds.add(artifact.trace_id);
    if (artifact.slip_id) seenSlipIds.add(artifact.slip_id);
    if (artifact.ticket_id) seenTicketIds.add(artifact.ticket_id);
  }

  return kept.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function listLearningArtifacts(): SettledLearningArtifact[] {
  const reviewedArtifacts = listReviewedAttributions().map(
    extractLearningArtifactFromReviewedRecord
  );
  const settledArtifacts = listPersistedPostmortems().map(extractLearningArtifactFromPostmortem);

  return dedupeLearningArtifacts([...reviewedArtifacts, ...settledArtifacts]);
}

export function getDraftLearningAdvisory(slip: SlipBuilderLeg[]): DraftLearningAdvisory | null {
  return buildDraftLearningAdvisory(listLearningArtifacts(), slip);
}
