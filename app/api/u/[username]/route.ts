import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSupabaseServiceClient } from '@/src/core/supabase/service';

const usernameSchema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/)
});

export async function GET(_: Request, { params }: { params: { username: string } }) {
  const parsedParams = usernameSchema.safeParse(params);
  if (!parsedParams.success) return NextResponse.json({ error: 'Invalid username.' }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, created_at')
    .eq('username', parsedParams.data.username)
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });

  const { data: slips, error: slipsError } = await supabase
    .from('slips')
    .select('id, raw_text, source_type, created_at, settlements(status)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (slipsError) return NextResponse.json({ error: 'Unable to load profile slips.' }, { status: 500 });

  return NextResponse.json({
    profile: {
      username: profile.username,
      joinedAt: profile.created_at
    },
    historicalBets: (slips ?? []).map((slip) => ({
      id: slip.id,
      slipText: slip.raw_text,
      outcome: Array.isArray((slip as { settlements?: Array<{ status?: string }> }).settlements)
        ? (((slip as { settlements?: Array<{ status?: string }> }).settlements?.[0]?.status) ?? 'pending')
        : 'pending',
      createdAt: slip.created_at,
      sourceType: slip.source_type,
    }))
  });
}
