import { NextResponse } from 'next/server';

import { getBettorMemorySnapshot } from '@/src/core/bettor-memory/service.server';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sportsbook = url.searchParams.get('sportsbook');
  const status = url.searchParams.get('status');
  const verification = url.searchParams.get('verification_status');
  const verified = url.searchParams.get('verified');
  const marketType = url.searchParams.get('market_type');
  const sport = url.searchParams.get('sport');
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const snapshot = await getBettorMemorySnapshot(data.user?.id ?? null);
    const matchVerification = (value: string) => {
      if (verification && value !== verification) return false;
      if (verified && String(value === 'verified') !== verified) return false;
      return true;
    };
    const slips = snapshot.slips.filter((slip) => {
      if (sportsbook && slip.sportsbook !== sportsbook) return false;
      if (status && slip.status !== status) return false;
      if (!matchVerification(slip.verification_status)) return false;
      if (sport && slip.sport !== sport) return false;
      if (marketType && !slip.legs.some((leg) => (leg.normalized_market_label ?? leg.market_type) === marketType)) return false;
      return true;
    });
    const artifacts = snapshot.artifacts.filter((artifact) => {
      if (sportsbook && artifact.source_sportsbook !== sportsbook) return false;
      return matchVerification(artifact.verification_status);
    });
    const accountActivity = snapshot.accountActivity.filter((activity) => {
      if (sportsbook && activity.source_sportsbook !== sportsbook) return false;
      return matchVerification(activity.verification_status);
    });
    return NextResponse.json({ ...snapshot, artifacts, slips, accountActivity });
  } catch {
    return NextResponse.json(await getBettorMemorySnapshot(null));
  }
}
