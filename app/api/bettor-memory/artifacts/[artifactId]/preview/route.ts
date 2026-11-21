import { NextResponse } from 'next/server';

import { createArtifactPreviewUrl } from '@/src/core/bettor-memory/service.server';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

export async function GET(_request: Request, context: { params: { artifactId: string } }) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
  try {
    const signedUrl = await createArtifactPreviewUrl(data.user.id, context.params.artifactId);
    return NextResponse.json({ ok: true, signed_url: signedUrl, expires_in_seconds: 600 }, {
      headers: { 'Cache-Control': 'private, no-store' }
    });
  } catch {
    return NextResponse.json({ error: 'Preview could not be created.' }, { status: 500 });
  }
}
