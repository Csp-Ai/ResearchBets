'use client';

import { useState } from 'react';

import { TicketXRay } from '@/src/components/xray/TicketXRay';

export function XRayVisualDetails() {
  const [open, setOpen] = useState(false);

  return (
    <section className="border-t border-white/10 pt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 py-2 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-sm font-medium text-slate-200">Visual dependency map</span>
          <span className="mt-1 block text-xs text-slate-500">
            Inspect each leg, dependency edge, memory match, and repair path.
          </span>
        </span>
        <span className="text-lg text-slate-500">{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="mt-4"><TicketXRay /></div> : null}
    </section>
  );
}
