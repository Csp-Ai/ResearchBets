import CockpitLandingClient from '@/app/cockpit/CockpitLandingClient';

export function CanonicalLanding({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  return <CockpitLandingClient searchParams={searchParams} />;
}
