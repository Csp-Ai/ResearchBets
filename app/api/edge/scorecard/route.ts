import { NextResponse } from 'next/server';

import { generateEdgeScorecard } from '@/src/core/measurement/edge';

export const dynamic = 'force-dynamic';
export async function GET(): Promise<NextResponse> {
  const scorecard = await generateEdgeScorecard();
  return NextResponse.json(scorecard);
}
