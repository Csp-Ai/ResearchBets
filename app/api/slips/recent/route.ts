import { NextResponse } from 'next/server';

import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

const extractTitle = (rawText: string): string => {
  const first = rawText.split('\n').map((line) => line.trim()).find(Boolean) ?? 'Recent slip';
  return first.length > 72 ? `${first.slice(0, 69)}...` : first;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') ?? 2);
  const anonId = searchParams.get('anon_id') ?? searchParams.get('anon_session_id') ?? undefined;
  const userId = searchParams.get('user_id') ?? undefined;

  const slips = await getRuntimeStore().listSlipSubmissions({
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 10) : 2,
    anonSessionId: userId ? undefined : anonId,
    userId,
  });

  return NextResponse.json({
    slips: slips.map((slip) => ({
      id: slip.id,
      title: extractTitle(slip.rawText),
      note: `${slip.parseStatus === 'parsed' ? 'Parsed' : 'Submitted'} · ${new Date(slip.createdAt).toLocaleString()}`,
      trace_id: slip.traceId,
      created_at: slip.createdAt
    }))
  });
}
