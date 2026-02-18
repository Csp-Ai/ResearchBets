import { LiveGamesClient } from '@/src/components/live/LiveGamesClient';

export default function LiveGamesPage({ searchParams }: { searchParams?: { sport?: string } }) {
  return <LiveGamesClient initialSport={searchParams?.sport ?? 'NFL'} />;
}
