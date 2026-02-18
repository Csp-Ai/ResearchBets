import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { ControlPlaneEventSchema } from '@/src/core/control-plane/events';

export async function POST(request: Request) {
  const payload = await request.json();
  const event = ControlPlaneEventSchema.parse(payload);
  await new DbEventEmitter().emit(event);
  return NextResponse.json({ ok: true });
}
