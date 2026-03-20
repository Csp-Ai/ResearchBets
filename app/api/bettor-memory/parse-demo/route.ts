import { NextResponse } from 'next/server';
import { z } from 'zod';

import { parseArtifact } from '@/src/core/bettor-memory/service.server';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

const schema = z.object({
  artifact_id: z.string().uuid(),
  artifact_type: z.enum(['slip_screenshot', 'account_activity_screenshot', 'bet_result_screenshot', 'unknown_betting_artifact']),
  raw_text: z.string().optional(),
  source_sportsbook: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: 'Sign in is required to persist parsed records.' }, { status: 401 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid parse request.' }, { status: 400 });
    const result = await parseArtifact({
      bettorId: data.user.id,
      artifactId: parsed.data.artifact_id,
      artifactType: parsed.data.artifact_type,
      rawText: parsed.data.raw_text,
      sourceSportsbook: parsed.data.source_sportsbook,
    });
    return NextResponse.json({ ok: true, verification_required: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Parse failed.' }, { status: 500 });
  }
}
