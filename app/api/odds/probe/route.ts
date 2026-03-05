import { NextResponse } from 'next/server';

import { runOddsProbe } from '@/src/core/providers/oddsProbe.server';

export const runtime = 'nodejs';

export async function GET() {
  const result = await runOddsProbe();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
