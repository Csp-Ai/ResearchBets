import { NextResponse } from 'next/server';

import { saveUploadedArtifact } from '@/src/core/bettor-memory/service.server';
import type { ArtifactType } from '@/src/core/bettor-memory/types';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

const artifactTypes = new Set<ArtifactType>(['slip_screenshot', 'account_activity_screenshot', 'bet_result_screenshot', 'unknown_betting_artifact']);

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: 'Sign in is required to persist uploads to bettor history.' }, { status: 401 });
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
    const artifactTypeRaw = form.get('artifact_type');
    const artifactType = typeof artifactTypeRaw === 'string' && artifactTypes.has(artifactTypeRaw as ArtifactType) ? artifactTypeRaw as ArtifactType : 'unknown_betting_artifact';
    const artifact = await saveUploadedArtifact({
      bettorId: data.user.id,
      file,
      artifactType,
      sourceSportsbook: typeof form.get('source_sportsbook') === 'string' ? String(form.get('source_sportsbook')) : null,
      width: form.get('width') ? Number(form.get('width')) : null,
      height: form.get('height') ? Number(form.get('height')) : null,
    });
    return NextResponse.json({ ok: true, artifact, message: 'Saved to bettor history.' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed.' }, { status: 500 });
  }
}
