import { NextResponse } from 'next/server';

import { getBoardData, type BoardSport } from '@/src/core/board/boardService.server';
import { appendQuery } from '@/src/components/landing/navigation';

type RouteQuery = {
  sport: BoardSport;
  tz: string;
  date: string;
  mode: string;
};

const asSport = (value: string | null): BoardSport => {
  if (value === 'NFL' || value === 'NHL' || value === 'MLB' || value === 'UFC') return value;
  return 'NBA';
};

const toQuery = (url: URL): RouteQuery => ({
  sport: asSport(url.searchParams.get('sport')),
  tz: url.searchParams.get('tz') ?? 'America/Phoenix',
  date: url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10),
  mode: url.searchParams.get('mode') ?? 'auto'
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = toQuery(url);
  const boardData = await getBoardData({
    sport: query.sport,
    tz: query.tz,
    date: query.date,
    demoRequested: query.mode === 'demo'
  });

  const deterministicScouts = (boardData.scouts.length > 0 ? boardData.scouts : []).slice(0, 2);
  const weakestLeg = deterministicScouts[1]?.headline ?? deterministicScouts[0]?.headline ?? 'Board signal pending';

  return NextResponse.json({
    traceId: 'demo-trace',
    steps: ['Scout', 'Risk', 'Notes'],
    weakestLeg,
    generatedAt: new Date().toISOString(),
    ctas: [
      { label: 'Run stress test', href: appendQuery('/stress-test', query) },
      { label: 'Use sample slip', href: appendQuery('/ingest', { ...query, prefill: deterministicScouts.map((scout) => scout.headline).join('\n') }) },
      { label: 'Open Board', href: appendQuery('/today', query) }
    ]
  });
}
