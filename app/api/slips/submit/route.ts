import { createHash, randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { coerceContextSpine, spineFromRequest, type ContextSpine } from '@/src/core/contracts/contextSpine';
import { ensureTraceMeta } from '@/src/core/contracts/trace';
import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { applyRateLimit } from '@/src/core/http/rateLimit';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';
import { buildSharedSlipFeedback } from '@/src/agents/sharedSlipFeedback';
import { parseSlipText } from '@/src/core/slips/freeTextParser';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

const legacyPayloadSchema = z.object({
  anon_session_id: z.string().min(1),
  user_id: z.string().optional().nullable(),
  source: z.enum(['paste', 'upload']),
  raw_text: z.string().trim().min(1).max(6000),
  request_id: z.string().min(1),
  trace_id: z.string().min(1).optional(),
});

const draftPayloadSchema = z.object({
  anon_id: z.string().optional(),
  source_type: z.enum(['self', 'shared']).optional(),
  spine: z.object({
    sport: z.string().min(1),
    tz: z.string().min(1),
    date: z.string().min(1),
    mode: z.enum(['live', 'demo', 'cache']),
    anon_id: z.string().optional(),
    user_id: z.string().nullable().optional(),
  }),
  legs: z.array(z.record(z.unknown())).min(1).optional(),
  request_id: z.string().optional(),
  trace_id: z.string().optional(),
  anon_session_id: z.string().optional(),
  user_id: z.string().nullable().optional(),
  source: z.enum(['paste', 'upload']).optional(),
  raw_text: z.string().optional(),
});

const payloadSchema = z.union([legacyPayloadSchema, draftPayloadSchema]);

export async function POST(request: Request) {
  const limited = applyRateLimit(request, { route: 'slips:submit', limit: 10 });
  if (limited) return limited;

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid slip payload.' }, { status: 400 });

  const body = parsed.data;
  const store = getRuntimeStore();
  const requestSpine = spineFromRequest(request);

  const anonSessionId = ('anon_session_id' in body && body.anon_session_id)
    || ('anon_id' in body && body.anon_id)
    || ('spine' in body && body.spine.anon_id)
    || requestSpine.anon_session_id
    || randomUUID();
  const userId = ('user_id' in body ? body.user_id : null) ?? ('spine' in body ? body.spine.user_id : null) ?? null;
  const requestId = ('request_id' in body && body.request_id) ? body.request_id : randomUUID();

  const baseSpine: ContextSpine = coerceContextSpine(
    {
      sport: 'spine' in body ? body.spine.sport : requestSpine.sport,
      tz: 'spine' in body ? body.spine.tz : requestSpine.tz,
      date: 'spine' in body ? body.spine.date : requestSpine.date,
      mode: 'spine' in body ? body.spine.mode : requestSpine.mode,
      reason: requestSpine.reason,
      anon_session_id: anonSessionId,
    },
    {
      sport: 'NBA',
      tz: 'America/Phoenix',
      date: new Date().toISOString().slice(0, 10),
      mode: 'demo',
      anon_session_id: anonSessionId,
    }
  );

  const trace = ensureTraceMeta(baseSpine, 'user', ('trace_id' in body && body.trace_id) ? body.trace_id : requestSpine.trace_id);

  const rawText = 'raw_text' in body && typeof body.raw_text === 'string' && body.raw_text.trim().length > 0
    ? body.raw_text
    : ('legs' in body && body.legs
      ? body.legs.map((leg) => {
        const row = leg as Record<string, unknown>;
        return `${String(row.player ?? 'Player')} ${String(row.marketType ?? row.market ?? 'prop')} ${String(row.line ?? '')} ${String(row.odds ?? '')}`.trim();
      }).join('\n')
      : 'Draft slip submitted');

  const checksum = createHash('sha256').update(rawText).digest('hex');
  const id = randomUUID();

  await store.createSlipSubmission({
    id,
    anonSessionId,
    userId,
    createdAt: new Date().toISOString(),
    source: ('source' in body && body.source) ? body.source : 'paste',
    rawText,
    parseStatus: 'received',
    extractedLegs: ('legs' in body && body.legs ? body.legs : null) as Record<string, unknown>[] | null,
    traceId: trace.trace_id,
    requestId,
    checksum,
  });

  const parsedSlip = parseSlipText(rawText);
  const sourceType = 'source_type' in body && body.source_type ? body.source_type : 'self';

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
          raw_json: { confidence: parsedSlip.confidence }
        })
        .select('id')
        .single();

      if (savedSlip?.id && parsedSlip.legs.length > 0) {
        await supabase.from('legs').insert(parsedSlip.legs.map((leg) => ({
          slip_id: savedSlip.id,
          sport: leg.sport,
          league: leg.league,
          event_date: leg.eventDate,
          team_or_player: leg.teamOrPlayer,
          market_type: leg.marketType,
          line: leg.line,
          odds: leg.odds,
          book: leg.book,
        })));
      }

      if (savedSlip?.id && sourceType === 'shared') {
        const feedback = buildSharedSlipFeedback(parsedSlip.legs);
        await supabase.from('feedback_items').insert({
          slip_id: savedSlip.id,
          type: 'agent_feedback',
          body: feedback.body,
        });
      }
    }
  } catch {
    // Keep deterministic runtime flow alive when Supabase is not configured.
  }

  await new DbEventEmitter(store).emit({
    event_name: 'slip_submitted',
    timestamp: new Date().toISOString(),
    request_id: requestId,
    trace_id: trace.trace_id,
    session_id: anonSessionId,
    user_id: userId,
    agent_id: 'slip_ingestion',
    model_version: 'runtime-deterministic-v1',
    properties: {
      slip_id: id,
      checksum,
      sport: baseSpine.sport,
      mode: baseSpine.mode,
      reason: baseSpine.reason,
      tz: baseSpine.tz,
      date: baseSpine.date,
      anon_session_id: baseSpine.anon_session_id,
      legs_count: parsedSlip.legs.length,
      parse_confidence: parsedSlip.confidence,
      needs_review: parsedSlip.legs.length === 0,
      source_type: sourceType,
    },
  }, baseSpine);

  const spine: ContextSpine = { ...baseSpine, trace_id: trace.trace_id, slip_id: id };
  return NextResponse.json({
    slip_id: id,
    trace_id: trace.trace_id,
    anon_id: anonSessionId,
    spine,
    trace,
    parse: {
      confidence: parsedSlip.confidence,
      legs_count: parsedSlip.legs.length,
      needs_review: parsedSlip.legs.length === 0,
    }
  });
}
