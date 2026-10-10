import { createHash, randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { REVIEW_MARKETS } from '@/src/core/track/slipReview';

import { coerceContextSpine, type ContextSpine } from '@/src/core/contracts/contextSpine';
import { SlipSubmitRequestSchema, SlipSubmitResultSchema } from '@/src/core/contracts/envelopes';
import { ensureTraceMeta } from '@/src/core/contracts/trace';
import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { applyRateLimit } from '@/src/core/http/rateLimit';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { buildSharedSlipFeedback } from '@/src/agents/sharedSlipFeedback';
import { parseSlipText } from '@/src/core/slips/freeTextParser';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

// Reviewed selections are user claims, not verified sportsbook records.
const reviewedLegSchema = z.object({
  player: z.string().trim().min(3).max(120),
  league: z.enum(['NFL', 'NBA']),
  marketType: z.string().min(1),
  line: z.string().min(1),
  odds: z.string().nullable().optional(),
  game: z.string().nullable().optional(),
  direction: z.enum(['over', 'under']),
  review_state: z.literal('bettor_reviewed')
}).superRefine((leg, ctx) => {
  if (!(REVIEW_MARKETS[leg.league] as readonly string[]).includes(leg.marketType)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Unsupported player market.' });
  }
  const threshold = Number(leg.line.match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1000) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid threshold.' });
  }
  if (leg.marketType === 'anytime_td' && (threshold !== 1 || leg.direction !== 'over')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid anytime touchdown threshold.' });
  }
  if (leg.odds && !/^[+-]\d{2,4}$/.test(leg.odds)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid American odds.' });
  }
});

export async function POST(request: Request) {
  const limited = applyRateLimit(request, { route: 'slips:submit', limit: 10 });
  if (limited) return limited;

  const traceContext = getTraceContext(request);
  const parsed = SlipSubmitRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'invalid_payload', message: 'Invalid slip payload.' },
        trace_id: traceContext.trace_id,
        traceId: traceContext.trace_id
      },
      { status: 400 }
    );
  }

  try {
    const body = parsed.data;
    let store: ReturnType<typeof getRuntimeStore> | null = null;
    const isBettorReviewed = (body.legs ?? []).some((leg) => leg.review_state === 'bettor_reviewed');
    const reviewed = isBettorReviewed
      ? z.array(reviewedLegSchema).min(1).max(16).safeParse(body.legs)
      : null;
    if (reviewed && !reviewed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'invalid_reviewed_legs', message: 'Check the reviewed player, market, threshold, league, and price.' }, trace_id: traceContext.trace_id },
        { status: 400 }
      );
    }
    const reviewedLegs = reviewed?.success ? reviewed.data : null;

    const anonSessionId =
      body.anon_session_id || body.anon_id || body.spine?.anon_id || randomUUID();
    const userId = body.user_id ?? body.spine?.user_id ?? null;
    const requestId = body.request_id ?? randomUUID();

    const baseSpine: ContextSpine = coerceContextSpine(
      {
        sport: body.spine?.sport ?? traceContext.sport,
        tz: body.spine?.tz ?? traceContext.tz,
        date: body.spine?.date ?? traceContext.date,
        mode: body.spine?.mode ?? traceContext.mode,
        anon_session_id: anonSessionId
      },
      {
        sport: 'NBA',
        tz: 'America/Phoenix',
        date: new Date().toISOString().slice(0, 10),
        mode: 'demo',
        anon_session_id: anonSessionId
      }
    );

    const trace = ensureTraceMeta(baseSpine, 'user', body.trace_id ?? traceContext.trace_id);

    const rawText =
      body.raw_text && body.raw_text.trim().length > 0
        ? body.raw_text
        : body.legs
          ? body.legs
              .map((leg) =>
                `${String(leg.player ?? 'Player')} ${String(leg.marketType ?? leg.market ?? 'prop')} ${String(leg.line ?? '')} ${String(leg.odds ?? '')}`.trim()
              )
              .join('\n')
          : 'Draft slip submitted';

    const checksum = createHash('sha256').update(rawText).digest('hex');
    const id = body.slip_id ?? randomUUID();

    try {
      store = getRuntimeStore();
      await store.createSlipSubmission({
        id,
        anonSessionId,
        userId,
        createdAt: new Date().toISOString(),
        source: body.source ?? 'paste',
        rawText,
        parseStatus: 'received',
        extractedLegs: (body.legs ?? null) as Record<string, unknown>[] | null,
        traceId: trace.trace_id,
        requestId,
        checksum
      });
    } catch {
      // Anonymous X-Ray must stay available when optional cloud persistence is degraded.
      store = null;
    }

    const parsedSlip = parseSlipText(rawText);
    const sourceType = body.source_type ?? 'self';
    const extractedLegs = reviewedLegs
      ? reviewedLegs.map((leg) => ({
          sport: leg.league === 'NFL' ? 'Football' : 'Basketball',
          league: leg.league,
          eventDate: null,
          teamOrPlayer: leg.player,
          marketType: leg.marketType,
          line: Number(leg.line.match(/\d+(?:\.\d+)?/)?.[0]),
          odds: leg.odds ? Number(leg.odds) : null,
          book: null
        }))
      : parsedSlip.legs;

    try {
      const supabase = await getSupabaseServerClient();
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData.user?.id ?? userId ?? null;
      if (authUserId) {
        const { data: savedSlip } = await supabase
          .from('slips')
          .insert({
            user_id: authUserId,
            source_type: sourceType,
            raw_text: rawText,
            raw_json: {
              parser_confidence: parsedSlip.confidence,
              review_state: reviewedLegs ? 'bettor_reviewed' : 'unreviewed',
              submitted_selection_count: extractedLegs.length
            }
          })
          .select('id')
          .single();
        if (savedSlip?.id && extractedLegs.length > 0) {
          await supabase
            .from('legs')
            .insert(
              extractedLegs.map((leg) => ({
                slip_id: savedSlip.id,
                sport: leg.sport,
                league: leg.league,
                event_date: leg.eventDate,
                team_or_player: leg.teamOrPlayer,
                market_type: leg.marketType,
                line: leg.line,
                odds: leg.odds,
                book: leg.book
              }))
            );
        }
        if (savedSlip?.id && sourceType === 'shared') {
          const feedback = buildSharedSlipFeedback(parsedSlip.legs); // unverified feedback stays parser-derived
          await supabase
            .from('feedback_items')
            .insert({ slip_id: savedSlip.id, type: 'agent_feedback', body: feedback.body });
        }
      }
    } catch {
      // Keep deterministic runtime flow alive when Supabase is not configured.
    }

    if (store) {
      await new DbEventEmitter(store).emit(
        {
        event_name: 'slip_submitted',
        timestamp: new Date().toISOString(),
        request_id: requestId,
        trace_id: trace.trace_id,
        session_id: anonSessionId,
        user_id: userId,
        agent_id: 'slip_ingestion',
        model_version: 'runtime-deterministic-v1',
        properties: {
          phase: 'BEFORE',
          slip_id: id,
          checksum,
          sport: baseSpine.sport,
          mode: baseSpine.mode,
          tz: baseSpine.tz,
          date: baseSpine.date,
          anon_session_id: baseSpine.anon_session_id,
          legs_count: extractedLegs.length,
          parse_confidence: parsedSlip.confidence,
          review_state: reviewedLegs ? 'bettor_reviewed' : 'unreviewed',
          needs_review: !reviewedLegs && parsedSlip.legs.length === 0,
          source_type: sourceType
        }
        },
        baseSpine
      ).catch(() => undefined);
    }

    const spine: ContextSpine = { ...baseSpine, trace_id: trace.trace_id, slip_id: id };
    const response = SlipSubmitResultSchema.parse({
      slip_id: id,
      trace_id: trace.trace_id,
      anon_id: anonSessionId,
      spine,
      trace,
      parse: {
        confidence: parsedSlip.confidence,
        legs_count: extractedLegs.length,
        needs_review: !reviewedLegs && parsedSlip.legs.length === 0
      }
    });
    return NextResponse.json({
      ok: true,
      data: {
        ...response,
        traceId: response.trace_id,
        trace: { ...trace, traceId: trace.trace_id }
      },
      trace_id: trace.trace_id,
      traceId: trace.trace_id,
      provenance: { mode: baseSpine.mode, generatedAt: new Date().toISOString() }
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'submit_failed', message: 'Failed to submit slip.' },
        trace_id: traceContext.trace_id,
        traceId: traceContext.trace_id
      },
      { status: 500 }
    );
  }
}
