'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { draftSlipToTrackedTicket } from '@/src/core/track/fromDraftSlip';
import { saveTrackedTicket } from '@/src/core/track/store';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

export function TicketPulseLaunch() {
  const router = useRouter();
  const nervous = useNervousSystem();
  const { draft, isHydrated } = useDraftSlip();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  if (!isHydrated || draft.legs.length === 0) return null;

  const openPulse = () => {
    setStatus('saving');
    try {
      const ticket = draftSlipToTrackedTicket({
        draft,
        spine: nervous,
      });
      saveTrackedTicket(ticket);
      setStatus('saved');
      router.push(nervous.toHref('/pulse', { mode: 'live' }));
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-[linear-gradient(135deg,rgba(7,13,21,.94),rgba(3,7,12,.98))] p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-emerald-300/[0.06] blur-[90px]" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-emerald-100/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-45" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Next stage · Ticket Pulse
          </div>
          <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-slate-100">
            Carry this X-Ray into live tracking.
          </h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-slate-500">
            ResearchBets preserves the same ticket identity, polls live leg updates when coverage exists, and keeps strongest/weakest-leg continuity through settlement.
          </p>
        </div>

        <button
          type="button"
          onClick={openPulse}
          disabled={status === 'saving'}
          className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-100 to-white px-4 py-3 text-[11px] font-bold text-[#071015] disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving ticket…' : status === 'saved' ? 'Opening Pulse…' : 'Track live →'}
        </button>
      </div>

      {status === 'error' ? (
        <p className="relative mt-3 text-[10px] text-rose-200/80">
          Could not persist this ticket for live tracking. The X-Ray is unchanged.
        </p>
      ) : null}
    </section>
  );
}
