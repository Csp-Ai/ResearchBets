import { NextResponse } from 'next/server';

import { computeActivityHeatmap, computeMarketPerformance, computePerformanceSummary, computeSlipSizePerformance, computeSportsbookPerformance, computeWeeklyRollups, generateAdvisorySignals } from '@/src/core/bettor-memory/analytics';
import { getBettorMemorySnapshot } from '@/src/core/bettor-memory/service.server';
import { getSupabaseServerClient } from '@/src/core/supabase/server';

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const snapshot = await getBettorMemorySnapshot(data.user?.id ?? null);
    return NextResponse.json({
      snapshot,
      performance: computePerformanceSummary(snapshot.slips),
      weekly: computeWeeklyRollups(snapshot.slips),
      byMarket: computeMarketPerformance(snapshot.slips),
      bySlipSize: computeSlipSizePerformance(snapshot.slips),
      bySportsbook: computeSportsbookPerformance(snapshot.slips),
      heatmap: computeActivityHeatmap(snapshot.slips),
      advisorySignals: generateAdvisorySignals(snapshot.slips),
    });
  } catch {
    const snapshot = await getBettorMemorySnapshot(null);
    return NextResponse.json({
      snapshot,
      performance: computePerformanceSummary(snapshot.slips),
      weekly: computeWeeklyRollups(snapshot.slips),
      byMarket: computeMarketPerformance(snapshot.slips),
      bySlipSize: computeSlipSizePerformance(snapshot.slips),
      bySportsbook: computeSportsbookPerformance(snapshot.slips),
      heatmap: computeActivityHeatmap(snapshot.slips),
      advisorySignals: generateAdvisorySignals(snapshot.slips),
    });
  }
}
