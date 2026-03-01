import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

const SaveSchema = z.object({
  trace_id: z.string().min(1),
  contact: z.string().email(),
});

export async function POST(request: Request) {
  const parsed = SaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Provide a valid email to save analysis.' }, { status: 400 });
  }

  const payload = parsed.data;

  try {
    const store = getRuntimeStore();
    await store.saveEvent({
      event_name: 'learning_update',
      timestamp: new Date().toISOString(),
      request_id: crypto.randomUUID(),
      trace_id: payload.trace_id,
      session_id: 'cockpit',
      user_id: null,
      agent_id: 'cockpit',
      model_version: 'runtime-deterministic-v1',
      properties: {
        contact: payload.contact,
        created_at: new Date().toISOString(),
      },
    });
  } catch {
    // Keep UX neutral and non-blocking when persistence backend is unavailable.
  }

  return NextResponse.json({ ok: true, message: 'Analysis saved.' });
}
