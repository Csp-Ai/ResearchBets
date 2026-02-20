import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createHistoricalBet, listHistoricalBets } from '@/src/core/bettor/historyStore';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

const createHistoricalBetSchema = z.object({
  bet_title: z.string().min(1),
  stake: z.number().finite(),
  odds: z.number().finite(),
  outcome: z.enum(['pending', 'won', 'lost', 'void']).optional()
});

const unauthorizedResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedResponse;
  }

  const bets = await listHistoricalBets(supabase, user.id);
  return NextResponse.json({ bets });
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedResponse;
  }

  const payload = createHistoricalBetSchema.parse(await request.json());
  const bet = await createHistoricalBet(supabase, user.id, payload);

  return NextResponse.json({ bet }, { status: 201 });
}
