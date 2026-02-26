import { NextResponse } from 'next/server';

import { getTodayPayload } from '@/src/core/today/service.server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === '1';
  const demoRequested = searchParams.get('demo') === '1';
  const payload = await getTodayPayload({ forceRefresh, demoRequested });
  return NextResponse.json(payload);
}
