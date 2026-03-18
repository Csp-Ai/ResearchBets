import type { ResearchRunDTO } from '@/src/core/run/researchRunDTO';

export type ReviewOutcome = 'win' | 'loss' | 'push';
export type ReviewInputMode = 'paste' | 'screenshot' | 'demo';

export type ReviewPostMortemResult = {
  ok: boolean;
  trace_id?: string;
  slip_id?: string;
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

export type ReviewParseTicket = {
  rawSlipText: string;
  trace_id?: string;
  slip_id?: string;
  legs: Array<unknown>;
};

export type ReviewResult = {
  dto: ResearchRunDTO;
  postmortem: ReviewPostMortemResult;
  parseTicket: ReviewParseTicket;
  trace_id: string;
  slip_id?: string;
  mode: ReviewInputMode;
  inputLabel: string;
};

export const REVIEW_DEMO_SAMPLE_NAME = 'Sample review (demo)';
export const REVIEW_DEMO_SAMPLE_TEXT = `Jayson Tatum over 29.5 points (-110)
Luka Doncic over 8.5 assists (-120)
LeBron James over 6.5 rebounds (-105)`;

export class ReviewIngestionError extends Error {
  code: 'parse_failed' | 'run_missing' | 'postmortem_failed';

  constructor(code: ReviewIngestionError['code'], message: string) {
    super(message);
    this.name = 'ReviewIngestionError';
    this.code = code;
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

export async function runReviewIngestion(
  input: {
    text: string;
    outcome: ReviewOutcome;
    mode: ReviewInputMode;
    sourceHint: 'paste' | 'screenshot' | 'demo';
    inputLabel: string;
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
      parsePayload.error?.message ?? 'Could not parse this review input yet. Try editing the text or use the demo sample instead.'
    );
  }

  if (!Array.isArray(parsePayload.data.legs) || parsePayload.data.legs.length === 0) {
    throw new ReviewIngestionError(
      'parse_failed',
      'No reviewable legs were detected from this input. Paste clearer slip text or try the demo sample instead.'
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
      'Review analysis did not finish. Try again, or use the demo sample if you just want to explore the flow.'
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
      mode: input.mode === 'demo' ? 'demo' : 'live'
    })
  });
  const postmortemPayload = (await postmortemResponse.json()) as PostmortemResponse;
  if (!postmortemResponse.ok || !('ok' in postmortemPayload) || postmortemPayload.ok !== true) {
    throw new ReviewIngestionError(
      'postmortem_failed',
      ('error' in postmortemPayload ? postmortemPayload.error?.message : undefined) ?? 'Postmortem review failed. The parsed slip was kept, but the after-action summary could not be generated.'
    );
  }

  return {
    dto,
    postmortem: postmortemPayload,
    parseTicket: parsePayload.data,
    trace_id: dto.trace_id ?? traceId,
    slip_id: dto.slip_id,
    mode: input.mode,
    inputLabel: input.inputLabel
  };
}
