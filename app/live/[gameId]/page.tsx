import { LiveGameDetailClient } from '@/src/components/live/LiveGameDetailClient';

export default function LiveGamePage({
  params,
  searchParams
}: {
  params: { gameId: string };
  searchParams?: { sport?: string; trace_id?: string };
}) {
  return (
    <LiveGameDetailClient
      gameId={params.gameId}
      sport={searchParams?.sport ?? 'NFL'}
      initialTraceId={searchParams?.trace_id}
    />
  );
}
