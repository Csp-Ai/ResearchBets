import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseUrlPresent = Boolean(supabaseUrl);
  const supabaseKeyPresent = Boolean(supabaseKey);
  const missing: string[] = [];

  if (!supabaseUrlPresent) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseKeyPresent) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (missing.length > 0) {
    return NextResponse.json({ ok: false, supabaseUrlPresent, supabaseKeyPresent, missing }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const { error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          supabaseUrlPresent,
          supabaseKeyPresent,
          error: `Supabase session check failed: ${error.message}`
        },
        { status: 502 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Supabase error';
    return NextResponse.json(
      {
        ok: false,
        supabaseUrlPresent,
        supabaseKeyPresent,
        error: `Supabase client initialization failed: ${message}`
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, supabaseUrlPresent, supabaseKeyPresent });
}
