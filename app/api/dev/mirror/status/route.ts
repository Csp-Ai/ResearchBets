import { NextResponse } from 'next/server';

const disabledMessage = 'Mirror disabled in launch branch';

export async function GET() {
  return NextResponse.json({ error: disabledMessage }, { status: 404 });
}
