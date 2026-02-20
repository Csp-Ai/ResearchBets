import { NextResponse } from 'next/server';

import { getBettorData } from '@/src/core/bettor/gateway.server';

export async function GET() {
  const payload = await getBettorData();
  return NextResponse.json(payload);
}
