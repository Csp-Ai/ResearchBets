'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

import { ReviewedTicketXRay } from '@/src/components/xray/ReviewedTicketXRay';
import { StressTestSecondaryPanels } from '@/src/components/xray/StressTestSecondaryPanels';
import { XRayBriefing } from '@/src/components/xray/XRayBriefing';
import { XRayVisualDetails } from '@/src/components/xray/XRayVisualDetails';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

export function StressTestContent() {
  const { draft, isHydrated } = useDraftSlip();
  const searchParams = useSearchParams();
  const nervous = useNervousSystem();
  const requestedSlip = searchParams.get('slip_id');

  if (!isHydrated) return <p role="status" className="p-4 text-sm text-slate-300">Loading Ticket X-Ray…</p>;

  const ingestion = draft.ingestion;
  if (ingestion?.confirmedLegs?.length) {
    if (requestedSlip && requestedSlip !== draft.slip_id) {
      return (
        <section className="space-y-3 px-2 py-4">
          <h1 className="text-xl font-semibold">Ticket unavailable</h1>
          <p className="text-sm text-slate-300">This tab does not have the reviewed ticket from that link.</p>
          <Link className="inline-flex min-h-11 items-center text-cyan-100 underline"
            href={nervous.toHref('/ingest', { slip_id: undefined, trace_id: undefined })}>Review a ticket</Link>
        </section>
      );
    }
    return <ReviewedTicketXRay ingestion={ingestion} />;
  }

  return (
    <>
      <XRayBriefing />
      <XRayVisualDetails />
      <StressTestSecondaryPanels />
    </>
  );
}
