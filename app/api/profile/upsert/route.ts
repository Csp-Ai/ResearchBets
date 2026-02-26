import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSupabaseServerClient } from '@/src/core/supabase/server';

const schema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid username.' }, { status: 400 });

  try {
    const supabase = await getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase.from('profiles').upsert({ id: user.id, username: parsed.data.username }, { onConflict: 'id' });
    if (error) return NextResponse.json({ error: 'Unable to save profile.' }, { status: 500 });

    return NextResponse.json({ ok: true, username: parsed.data.username });
  } catch {
    return NextResponse.json({ error: 'Live profile storage unavailable (demo mode active).' }, { status: 503 });
  }
}
