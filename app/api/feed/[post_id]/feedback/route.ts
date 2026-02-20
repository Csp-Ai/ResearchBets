import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSupabaseServiceClient } from '@/src/services/supabase';

const payloadSchema = z.object({
  value: z.enum(['up', 'down'])
});

export async function POST(request: Request, { params }: { params: { post_id: string } }) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid feedback payload.' }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  const { data: authData } = await supabase.auth.getUser(bearer);
  const user = authData.user;
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { error } = await supabase
    .from('post_feedback')
    .upsert({ post_id: params.post_id, user_id: user.id, value: parsed.data.value }, { onConflict: 'post_id,user_id' });

  if (error) return NextResponse.json({ error: 'Unable to store feedback.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
