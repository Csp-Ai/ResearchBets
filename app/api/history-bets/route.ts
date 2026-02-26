import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSupabaseServerClient } from '@/src/core/supabase/server';

type LegResult = 'win' | 'loss' | 'push' | 'unknown';

const settleSchema = z.object({
  slip_id: z.string().uuid(),
  mode: z.enum(['demo', 'live']).optional(),
});

const deterministicResult = (seed: string): LegResult => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  const pick = hash % 4;
  return pick === 0 ? 'win' : pick === 1 ? 'loss' : pick === 2 ? 'push' : 'unknown';
};

const impliedPnl = (odds: number | null, result: LegResult): number => {
  if (result !== 'win' || odds == null) return 0;
  if (odds > 0) return Number((odds / 100).toFixed(2));
  return Number((100 / Math.abs(odds)).toFixed(2));
};

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ slips: [] });

    const { data, error } = await supabase
      .from('slips')
      .select('id, source_type, raw_text, created_at, settlements(status, settled_at, pnl)')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ slips: [] });

    return NextResponse.json({
      slips: (data ?? []).map((slip) => ({
        id: slip.id,
        source_type: slip.source_type,
        title: (slip.raw_text ?? 'Slip').split('\n')[0]?.slice(0, 90) ?? 'Slip',
        created_at: slip.created_at,
        settlement: Array.isArray(slip.settlements) ? slip.settlements[0] ?? null : slip.settlements,
      }))
    });
  } catch {
    return NextResponse.json({ slips: [] });
  }
}

export async function POST(request: Request) {
  const parsed = settleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'slip_id is required.' }, { status: 400 });

  try {
    const supabase = await getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: slip } = await supabase
      .from('slips')
      .select('id, raw_text, created_at, source_type, legs(id, team_or_player, market_type, line, odds, event_date)')
      .eq('id', parsed.data.slip_id)
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!slip) return NextResponse.json({ error: 'Slip not found.' }, { status: 404 });

    const legs = Array.isArray(slip.legs) ? slip.legs : [];
    const useDemo = parsed.data.mode === 'demo' || legs.length === 0;

    const legRows = legs.map((leg) => {
      const result = deterministicResult(`${slip.id}:${leg.id}:${leg.team_or_player ?? 'leg'}`);
      return {
        leg_id: leg.id,
        result,
        evidence_json: {
          source: useDemo ? 'deterministic_demo_resolver' : 'api_resolver_unavailable',
          note: useDemo ? 'Demo results (not verified).' : 'Live feeds unavailable (demo mode active).',
        },
      };
    });

    if (legRows.length > 0) {
      await supabase.from('leg_results').upsert(legRows, { onConflict: 'leg_id' });
    }

    const counts = legRows.reduce((acc, row) => {
      acc[row.result] += 1;
      return acc;
    }, { win: 0, loss: 0, push: 0, unknown: 0 });

    const pnl = Number(legs.reduce((sum, leg, index) => sum + impliedPnl(leg.odds as number | null, legRows[index]?.result ?? 'unknown'), 0).toFixed(2));
    const status = counts.unknown > 0 ? (counts.win + counts.loss + counts.push > 0 ? 'partial' : 'pending') : 'settled';

    await supabase.from('settlements').upsert({
      slip_id: slip.id,
      status,
      settled_at: new Date().toISOString(),
      pnl,
      notes: useDemo ? 'Demo results (not verified).' : 'Live feeds unavailable (demo mode active).',
    }, { onConflict: 'slip_id' });

    return NextResponse.json({
      slip_id: slip.id,
      status,
      summary: counts,
      pnl,
      banner: useDemo ? 'Demo results (not verified).' : 'Live feeds unavailable (demo mode active).'
    });
  } catch {
    return NextResponse.json({ error: 'Settle unavailable right now.' }, { status: 500 });
  }
}
