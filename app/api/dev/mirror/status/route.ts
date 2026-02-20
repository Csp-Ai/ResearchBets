import { NextResponse } from 'next/server';

import { getSupabaseServiceClient } from '@/src/services/supabase';

const unauthorized = () => NextResponse.json({ error: 'Not found.' }, { status: 404 });

const assertDevelopmentAccess = (request: Request): NextResponse | null => {
  if (process.env.NODE_ENV !== 'development') {
    return unauthorized();
  }

  const adminSecret = process.env.ADMIN_SECRET_KEY?.trim();
  if (adminSecret) {
    const headerSecret = request.headers.get('x-admin-secret')?.trim();
    if (!headerSecret || headerSecret !== adminSecret) {
      return unauthorized();
    }
  }

  return null;
};

export async function GET(request: Request) {
  const accessError = assertDevelopmentAccess(request);
  if (accessError) return accessError;

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('code_embeddings')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lastIndexedAt: data?.updated_at ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
