import { NextResponse } from 'next/server';

import { getBettorData } from '@/src/core/bettor/gateway.server';

export async function GET(request: Request) {
  const liveHeader = request.headers.get('x-live-mode');
  const liveModeOverride = liveHeader === 'true' ? true : liveHeader === 'false' ? false : undefined;
  const payload = await getBettorData({ liveModeOverride });
  return NextResponse.json(payload);
}
