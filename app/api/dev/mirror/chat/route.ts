import { NextResponse } from 'next/server';

const disabledMessage = 'Mirror disabled in launch branch';

export async function POST() {
  return NextResponse.json({ error: disabledMessage }, { status: 404 });
}
