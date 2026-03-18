import type { ResearchRunDTO } from '@/src/core/run/researchRunDTO';

export type ReviewOutcome = 'win' | 'loss' | 'push';
export type ReviewInputMode = 'paste' | 'screenshot' | 'demo';
export type ReviewSourceType = 'pasted_text' | 'screenshot_ocr' | 'demo_sample';
export type ReviewParseStatus = 'success' | 'partial' | 'failed';

export type ReviewProvenance = {
  source_type: ReviewSourceType;
  parse_status: ReviewParseStatus;
  parse_confidence: number | null;
  had_manual_edits: boolean;
  trace_id: string | null;
  slip_id: string | null;
  generated_at: string;
};

export type ReviewPostMortemResult = {
  ok: boolean;
  trace_id?: string;
  slip_id?: string;
  attribution: import('@/src/core/postmortem/attribution').PostmortemAttribution | null;
  pattern_summary?: import('@/src/core/postmortem/patterns').BettorMistakePatternSummary;
  classification: {
    process: string;
    correlationMiss: boolean;
    injuryImpact: boolean;
    lineValueMiss: boolean;
  };
  notes: string[];
  correlationScore: number;
  volatilityTier: 'Low' | 'Med' | 'High' | 'Extreme';
  exposureSummary: {
    topGames: Array<{ game: string; count: number }>;
    topPlayers: Array<{ player: string; count: number }>;
  };
};

type ParsedLeg = {
  parseConfidence?: 'high' | 'medium' | 'low';
  needsReview?: boolean;
};

export type ReviewParseTicket = {
  rawSlipText: string;
  trace_id?: string;
  slip_id?: string;
  legs: Array<ParsedLeg>;
  parse_confidence?: number | null;
  extraction_confidence?: number | null;
  parse_status?: ReviewParseStatus;
};

export type ReviewResult = {
  dto: ResearchRunDTO;
  postmortem: ReviewPostMortemResult;
  parseTicket: ReviewParseTicket;
  trace_id: string;
  slip_id?: string;
  mode: ReviewInputMode;
  inputLabel: string;
  provenance: ReviewProvenance;
};

export const REVIEW_DEMO_SAMPLE_NAME = 'Sample review (demo)';
export const REVIEW_DEMO_SAMPLE_TEXT = `Jayson Tatum over 29.5 points (-110)
Luka Doncic over 8.5 assists (-120)
LeBron James over 6.5 rebounds (-105)`;

export class ReviewIngestionError extends Error {
  code: 'parse_failed' | 'run_missing' | 'postmortem_failed';
  provenance?: ReviewProvenance;

  constructor(code: ReviewIngestionError['code'], message: string, provenance?: ReviewProvenance) {
    super(message);
    this.name = 'ReviewIngestionError';
    this.code = code;
    this.provenance = provenance;
  }
}

type ParseResponse = { ok?: boolean; data?: ReviewParseTicket; error?: { message?: string } };
type PostmortemResponse = ReviewPostMortemResult | { ok?: false; error?: { message?: string } };

type ReviewDeps = {
  runSlip: typeof import('@/src/core/pipeline/runSlip').runSlip;
  runStore: typeof import('@/src/core/run/store').runStore;
  toResearchRunDTOFromRun: typeof import('@/src/core/run/researchRunDTO').toResearchRunDTOFromRun;
  fetchImpl?: typeof fetch;
};

const toSourceType = (mode: ReviewInputMode): ReviewSourceType => {
  if (mode === 'screenshot') return 'screenshot_ocr';
  if (mode === 'demo') return 'demo_sample';
  return 'pasted_text';
};

const resolveParseStatus = (ticket?: ReviewParseTicket | null): ReviewParseStatus => {
  if (!ticket || !Array.isArray(ticket.legs) || ticket.legs.length === 0) return 'failed';
  if (ticket.parse_status) return ticket.parse_status;

  const hasWeakLeg = ticket.legs.some((leg) => leg?.needsReview || leg?.parseConfidence === 'low');
  return hasWeakLeg ? 'partial' : 'success';
};

const resolveParseConfidence = (ticket?: ReviewParseTicket | null): number | null => {
  if (!ticket) return null;
  if (typeof ticket.parse_confidence === 'number') return ticket.parse_confidence;
  if (typeof ticket.extraction_confidence === 'number') return ticket.extraction_confidence;
  return null;
};

const buildProvenance = (
  input: { mode: ReviewInputMode; hadManualEdits?: boolean },
  details: {
    parseTicket?: ReviewParseTicket | null;
    trace_id?: string | null;
    slip_id?: string | null;
    generated_at?: string;
    parse_status?: ReviewParseStatus;
  }
): ReviewProvenance => ({
  source_type: toSourceType(input.mode),
  parse_status: details.parse_status ?? resolveParseStatus(details.parseTicket),
  parse_confidence: resolveParseConfidence(details.parseTicket),
  had_manual_edits: Boolean(input.hadManualEdits),
  trace_id: details.trace_id ?? details.parseTicket?.trace_id ?? null,
  slip_id: details.slip_id ?? details.parseTicket?.slip_id ?? null,
  generated_at: details.generated_at ?? new Date().toISOString()
});

export async function runReviewIngestion(
  input: {
    text: string;
    outcome: ReviewOutcome;
    mode: ReviewInputMode;
    sourceHint: 'paste' | 'screenshot' | 'demo';
    inputLabel: string;
    hadManualEdits?: boolean;
    continuity?: { trace_id?: string; slip_id?: string };
  },
  deps: ReviewDeps
): Promise<ReviewResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const parseResponse = await fetchImpl('/api/slips/parseText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: input.text,
      sourceHint: input.sourceHint,
      trace_id: input.continuity?.trace_id,
      slip_id: input.continuity?.slip_id
    })
  });
  const parsePayload = (await parseResponse.json()) as ParseResponse;

  if (!parseResponse.ok || !parsePayload.ok || !parsePayload.data) {
    throw new ReviewIngestionError(
      'parse_failed',
      parsePayload.error?.message ??
        'Could not parse this review input yet. Try editing the text or use the demo sample instead.',
      buildProvenance(input, {
        trace_id: input.continuity?.trace_id ?? null,
        slip_id: input.continuity?.slip_id ?? null,
        parse_status: 'failed'
      })
    );
  }

  const parseStatus = resolveParseStatus(parsePayload.data);
  if (!Array.isArray(parsePayload.data.legs) || parsePayload.data.legs.length === 0) {
    throw new ReviewIngestionError(
      'parse_failed',
      'No reviewable legs were detected from this input. Paste clearer slip text or try the demo sample instead.',
      buildProvenance(input, {
        parseTicket: parsePayload.data,
        trace_id: input.continuity?.trace_id ?? parsePayload.data.trace_id ?? null,
        slip_id: input.continuity?.slip_id ?? parsePayload.data.slip_id ?? null,
        parse_status: 'failed'
      })
    );
  }

  const traceId = await deps.runSlip(parsePayload.data.rawSlipText, {
    trace_id: input.continuity?.trace_id ?? parsePayload.data.trace_id,
    slip_id: input.continuity?.slip_id ?? parsePayload.data.slip_id
  });
  const run = await deps.runStore.getRun(traceId);
  if (!run) {
    throw new ReviewIngestionError(
      'run_missing',
      'Review analysis did not finish. Try again, or use the demo sample if you just want to explore the flow.',
      buildProvenance(input, {
        parseTicket: parsePayload.data,
        trace_id: input.continuity?.trace_id ?? parsePayload.data.trace_id ?? traceId,
        slip_id: input.continuity?.slip_id ?? parsePayload.data.slip_id ?? null,
        parse_status: parseStatus
      })
    );
  }

  const dto = deps.toResearchRunDTOFromRun(run);
  const postmortemResponse = await fetchImpl('/api/postmortem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      legs: dto.legs,
      outcome: input.outcome,
      trace_id: dto.trace_id,
      slip_id: dto.slip_id,
      mode: input.mode === 'demo' ? 'demo' : 'live',
      report: dto.report,
      parse_status: parseStatus
    })
  });
  const postmortemPayload = (await postmortemResponse.json()) as PostmortemResponse;
  if (!postmortemResponse.ok || !('ok' in postmortemPayload) || postmortemPayload.ok !== true) {
    throw new ReviewIngestionError(
      'postmortem_failed',
      ('error' in postmortemPayload ? postmortemPayload.error?.message : undefined) ??
        'Postmortem review failed. The parsed slip was kept, but the after-action summary could not be generated.',
      buildProvenance(input, {
        parseTicket: parsePayload.data,
        trace_id: dto.trace_id ?? traceId,
        slip_id: dto.slip_id ?? null,
        parse_status: parseStatus
      })
    );
  }

  return {
    dto,
    postmortem: postmortemPayload,
    parseTicket: parsePayload.data,
    trace_id: dto.trace_id ?? traceId,
    slip_id: dto.slip_id,
    mode: input.mode,
    inputLabel: input.inputLabel,
    provenance: buildProvenance(input, {
      parseTicket: parsePayload.data,
      trace_id: dto.trace_id ?? traceId,
      slip_id: dto.slip_id ?? null,
      parse_status: parseStatus
    })
  };
}

export { buildProvenance, resolveParseConfidence, resolveParseStatus };
