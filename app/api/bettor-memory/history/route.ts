import { NextResponse } from 'next/server';

import { getBettorMemorySnapshot } from '@/src/core/bettor-memory/service.server';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sportsbook = url.searchParams.get('sportsbook');
  const status = url.searchParams.get('status');
  const verified = url.searchParams.get('verified');
  const marketType = url.searchParams.get('market_type');
  const sport = url.searchParams.get('sport');
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const snapshot = await getBettorMemorySnapshot(data.user?.id ?? null);
    const slips = snapshot.slips.filter((slip) => {
      if (sportsbook && slip.sportsbook !== sportsbook) return false;
      if (status && slip.status !== status) return false;
      if (verified && String(slip.verification_status === 'verified') !== verified) return false;
      if (sport && slip.sport !== sport) return false;
      if (marketType && !slip.legs.some((leg) => (leg.normalized_market_label ?? leg.market_type) === marketType)) return false;
      return true;
    });
    return NextResponse.json({ ...snapshot, slips });
  } catch {
    return NextResponse.json(await getBettorMemorySnapshot(null));
  }
}
