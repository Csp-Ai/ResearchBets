import { NextResponse } from 'next/server';

import { assignExperiment } from '@/src/core/measurement/edge';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export async function GET(request: Request) {
  const store = getRuntimeStore();
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') ?? 'ai_guidance_clv_v1';
  const userId = searchParams.get('user_id');
  const anonSessionId = searchParams.get('anon_session_id');
  const assignment = await assignExperiment({ name, userId, anonSessionId }, store);
  return NextResponse.json({ name, ...assignment });
}
