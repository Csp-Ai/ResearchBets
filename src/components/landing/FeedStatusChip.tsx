'use client';

import React, { useState } from 'react';

type ProviderHealth = { provider: string; ok: boolean; message?: string; missingKey?: boolean };

export function FeedStatusChip({ health }: { health?: ProviderHealth[] }) {
  const [open, setOpen] = useState(false);
  const rows = health ?? [];
  const partial = rows.some((r) => !r.ok || r.missingKey);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] text-slate-200">
        {partial ? 'Live feeds: Partial' : 'Live feeds: OK'}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-white/15 bg-slate-950/95 p-2 text-xs">
          {rows.length === 0 ? <p className="text-slate-400">No provider health details.</p> : null}
          {rows.map((row) => (
            <div key={row.provider} className="mb-1 rounded border border-white/10 p-1.5">
              <p className="text-slate-100">{row.provider}: {row.ok && !row.missingKey ? 'green' : 'red'}</p>
              {row.missingKey ? <p className="text-amber-200">Missing key</p> : null}
              {row.message ? <p className="text-slate-300">{row.message}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
