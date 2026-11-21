import { NextResponse } from 'next/server';

import { saveUploadedArtifact } from '@/src/core/bettor-memory/service.server';
import { MAX_SCREENSHOT_BYTES, validateScreenshotBytes } from '@/src/core/bettor-memory/uploadValidation';
import type { ArtifactType } from '@/src/core/bettor-memory/types';
import { applyRateLimit } from '@/src/core/http/rateLimit';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

const artifactTypes = new Set<ArtifactType>([
  'slip_screenshot', 'account_activity_screenshot', 'bet_result_screenshot', 'unknown_betting_artifact'
]);

export async function POST(request: Request) {
  const limited = applyRateLimit(request, { route: 'bettor-memory:image-upload', limit: 6 });
  if (limited) return limited;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json(
        { error: 'Sign in is required to save original screenshots. Anonymous local OCR remains available.' },
        { status: 401 }
      );
    }
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
    if (file.size === 0 || file.size > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json({ error: 'Screenshot must be 8 MB or smaller.' }, { status: 413 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const image = validateScreenshotBytes(bytes, file.type);
    if (!image) {
      return NextResponse.json(
        { error: 'Invalid image type, signature, or dimensions. Use a PNG, JPEG, or WebP screenshot.' },
        { status: 415 }
      );
    }
    const artifactTypeRaw = form.get('artifact_type');
    const artifactType = typeof artifactTypeRaw === 'string' && artifactTypes.has(artifactTypeRaw as ArtifactType)
      ? artifactTypeRaw as ArtifactType : 'unknown_betting_artifact';
    // Rebuild with a trusted extension and dimensions rather than using attacker-provided filename metadata.
    const normalized = new File([bytes], 'screenshot.' + image.extension, { type: image.mime });
    const artifact = await saveUploadedArtifact({
      bettorId: data.user.id,
      file: normalized,
      artifactType,
      sourceSportsbook: typeof form.get('source_sportsbook') === 'string'
        ? String(form.get('source_sportsbook')).slice(0, 100) : null,
      width: image.width,
      height: image.height,
    });
    return NextResponse.json({ ok: true, artifact, message: 'Original screenshot saved for your review.' });
  } catch {
    // Do not expose storage credentials, filenames, raw OCR or provider errors.
    return NextResponse.json({ error: 'Image upload failed. Try again or continue with local OCR.' }, { status: 500 });
  }
}
