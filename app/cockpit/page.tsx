import { CanonicalLanding } from '@/app/_components/CanonicalLanding';

export default function CockpitPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  return <CanonicalLanding searchParams={searchParams} />;
}
