import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getArtifactReviewRecord, saveArtifactReview } from '@/src/core/bettor-memory/service.server';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

const slipLegSchema = z.object({
  leg_id: z.string().optional(),
  player_name: z.string().nullable(),
  team_name: z.string().nullable(),
  market_type: z.string().nullable(),
  line: z.number().nullable(),
  over_under_or_side: z.string().nullable(),
  odds: z.number().nullable(),
  result: z.enum(['won', 'lost', 'pushed', 'unknown']).nullable(),
  event_descriptor: z.string().nullable(),
  sport: z.string().nullable(),
  league: z.string().nullable(),
  confidence_score: z.number().nullable().optional(),
  normalized_market_label: z.string().nullable(),
});

const slipSchema = z.object({
  slip_id: z.string(),
  sportsbook: z.string().nullable(),
  placed_at: z.string().nullable(),
  settled_at: z.string().nullable(),
  stake: z.number().nullable(),
  payout: z.number().nullable(),
  potential_payout: z.number().nullable(),
  odds: z.number().nullable(),
  status: z.enum(['open', 'won', 'lost', 'pushed', 'cashed_out', 'partial', 'unknown']),
  leg_count: z.number(),
  sport: z.string().nullable(),
  league: z.string().nullable(),
  confidence_score: z.number().nullable().optional(),
  parse_quality: z.enum(['pending', 'parsed', 'partial', 'failed']),
  verification_status: z.enum(['needs_review', 'verified', 'rejected', 'parsed_demo', 'parsed_unverified', 'parse_pending', 'uploaded']),
  raw_source_reference: z.string().nullable(),
  legs: z.array(slipLegSchema),
});

const activitySchema = z.object({
  activity_import_id: z.string(),
  source_sportsbook: z.string().nullable(),
  beginning_balance: z.number().nullable(),
  end_balance: z.number().nullable(),
  deposited: z.number().nullable(),
  played_staked: z.number().nullable(),
  won_returned: z.number().nullable(),
  withdrawn: z.number().nullable(),
  rebated: z.number().nullable(),
  promotions_awarded: z.number().nullable(),
  promotions_played: z.number().nullable(),
  promotions_expired: z.number().nullable(),
  bets_placed: z.number().nullable(),
  bets_won: z.number().nullable(),
  activity_window_start: z.string().nullable(),
  activity_window_end: z.string().nullable(),
  verification_status: z.enum(['needs_review', 'verified', 'rejected', 'parsed_demo', 'parsed_unverified', 'parse_pending', 'uploaded']),
  parse_quality: z.enum(['pending', 'parsed', 'partial', 'failed']),
  confidence_score: z.number().nullable().optional(),
});

const saveSchema = z.object({
  verification_status: z.enum(['verified', 'rejected', 'needs_review']),
  review_notes: z.string().nullable().optional(),
  slip: slipSchema.optional(),
  accountActivity: activitySchema.optional(),
});

async function requireUser() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function GET(_request: Request, context: { params: { artifactId: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
  try {
    const detail = await getArtifactReviewRecord(user.id, context.params.artifactId);
    return NextResponse.json({ ok: true, detail });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Artifact review load failed.' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: { artifactId: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid review payload.' }, { status: 400 });
  try {
    const detail = await saveArtifactReview({
      bettorId: user.id,
      artifactId: context.params.artifactId,
      verificationStatus: parsed.data.verification_status,
      reviewNotes: parsed.data.review_notes ?? null,
      slip: parsed.data.slip ? { ...parsed.data.slip, confidence_score: parsed.data.slip.confidence_score ?? null, legs: parsed.data.slip.legs.map((leg) => ({ ...leg, leg_id: leg.leg_id ?? '', confidence_score: leg.confidence_score ?? null })) } : undefined,
      accountActivity: parsed.data.accountActivity ? { ...parsed.data.accountActivity, confidence_score: parsed.data.accountActivity.confidence_score ?? null } : undefined,
    });
    return NextResponse.json({ ok: true, detail, message: parsed.data.verification_status === 'verified' ? 'Verified record saved to bettor memory.' : 'Review state saved.' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Artifact review save failed.' }, { status: 500 });
  }
}
