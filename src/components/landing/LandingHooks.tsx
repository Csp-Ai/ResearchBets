'use client';

import React from 'react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import type { LandingHook } from '@/src/components/landing/deriveHooks';

type LandingHooksProps = {
  hooks: LandingHook[];
  loading?: boolean;
};

export function LandingHooks({ hooks, loading = false }: LandingHooksProps) {
  const nervous = useNervousSystem();
  const [openHookId, setOpenHookId] = useState<string | null>(null);

  const shownHooks = useMemo(() => hooks.slice(0, 6), [hooks]);

  return (
    <div className="mb-3 rounded-lg border border-cyan-300/20 bg-slate-950/70 p-2.5" data-testid="landing-hooks">
      <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/90">Signal hooks</p>
      <div className="mt-2 space-y-2">
        {loading
          ? Array.from({ length: 3 }, (_, i) => (
              <div key={`hook-sk-${i}`} className="rounded-md border border-white/10 bg-slate-900/60 p-2" data-testid="landing-hook-skeleton">
                <div className="h-3 w-1/3 rounded bg-white/10" />
                <div className="mt-1 h-3 w-5/6 rounded bg-white/10" />
                <div className="mt-2 h-6 w-20 rounded border border-white/10" />
              </div>
            ))
          : shownHooks.map((hook) => (
              <div key={hook.id} className="rounded-md border border-white/10 bg-slate-900/60 p-2">
                <p className="text-xs font-semibold text-cyan-100">{hook.title}</p>
                <p className="mt-0.5 text-xs text-slate-300">{hook.blurb}</p>
                {hook.ctaLabel === 'Learn why' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenHookId((current) => (current === hook.id ? null : hook.id))}
                      className="mt-1.5 rounded border border-white/20 px-2 py-1 text-[11px] text-slate-100 hover:border-cyan-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                    >
                      Learn why
                    </button>
                    {openHookId === hook.id ? (
                      <div className="mt-1.5 rounded border border-cyan-300/25 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-200">
                        Research cue only — no picks. Validate injury news, line drift, and slip overlap before stake.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <Link
                    href={appendQuery(nervous.toHref(hook.ctaHref.split('?')[0] ?? '/game'), { source: 'hook_open_game' })}
                    className="mt-1.5 inline-block rounded border border-white/20 px-2 py-1 text-[11px] text-slate-100 hover:border-cyan-300/60"
                  >
                    Open game
                  </Link>
                )}
              </div>
            ))}
      </div>
    </div>
  );
}
