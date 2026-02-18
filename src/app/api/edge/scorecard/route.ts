import { NextResponse } from 'next/server';

import { generateEdgeScorecard } from '../../../../core/measurement/edge';

export async function GET(): Promise<NextResponse> {
  const scorecard = await generateEdgeScorecard();
  return NextResponse.json(scorecard);
}
