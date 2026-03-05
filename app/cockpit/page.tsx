import CockpitLandingClient from './CockpitLandingClient';
import { BoardPreviewServer } from '@/src/components/landing/BoardPreview.server';

export default function CockpitPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  return (
    <>
      <div className="mx-auto mt-3 max-w-6xl px-3"><BoardPreviewServer searchParams={searchParams} /></div>
      <CockpitLandingClient />
    </>
  );
}
