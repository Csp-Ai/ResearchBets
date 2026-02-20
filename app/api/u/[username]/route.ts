import { NextResponse } from 'next/server';

import { getSupabaseServiceClient } from '@/src/core/supabase/service';

export async function GET(_: Request, { params }: { params: { username: string } }) {
  const supabase = getSupabaseServiceClient();
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, user_id, username, avatar_url, created_at')
    .eq('username', params.username)
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });

  const { data: bets, error: betsError } = await supabase
    .from('historical_bets')
    .select('id, slip_text, outcome, closing_line, created_at')
    .eq('user_id', profile.user_id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (betsError) return NextResponse.json({ error: 'Unable to load profile bets.' }, { status: 500 });

  return NextResponse.json({
    profile: {
      username: profile.username,
      avatarUrl: profile.avatar_url,
      joinedAt: profile.created_at
    },
    historicalBets: (bets ?? []).map((bet) => ({
      id: bet.id,
      slipText: bet.slip_text,
      outcome: bet.outcome,
      closingLine: bet.closing_line,
      createdAt: bet.created_at
    }))
  });
}
