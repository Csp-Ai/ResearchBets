import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { getServerEnv } from '@/src/core/env/server';

export async function GET() {
  const env = getServerEnv();

  if (env.missing.length > 0) {
    if (env.nodeEnv === 'production') {
      return NextResponse.json({ ok: true, degraded: true, mode: env.liveMode ? 'live' : 'demo' });
    }

    return NextResponse.json(
      {
        ok: false,
        missing: env.missing,
        hint: 'Copy .env.example to .env.local and fill the required values.'
      },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(env.supabaseUrl!, env.supabaseAnonKey!);
    const { error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({ ok: false, error: `Supabase session check failed: ${error.message}` }, { status: 502 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Supabase error';
    return NextResponse.json({ ok: false, error: `Supabase client initialization failed: ${message}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, mode: env.liveMode ? 'live' : 'demo' });
}
