import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { ControlPlaneEventSchema } from '@/src/core/control-plane/events';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export async function POST(request: Request) {
  const payload = await request.json();
  const event = ControlPlaneEventSchema.parse(payload);
  await new DbEventEmitter(getRuntimeStore()).emit(event);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const traceId = searchParams.get('trace_id') ?? undefined;
  const limit = Number(searchParams.get('limit') ?? 25);
  const events = await getRuntimeStore().listEvents({ traceId, limit: Number.isFinite(limit) ? limit : 25 });
  return NextResponse.json({ events });
}
