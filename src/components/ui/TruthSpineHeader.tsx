'use client';

import Link from 'next/link';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { getTruthModeCopy } from '@/src/core/ui/truthPresentation';

type HeaderAction = {
  label: string;
  href: string;
  tone?: 'primary' | 'secondary';
};

export function TruthSpineHeader({
  title,
  subtitle,
  freshness,
  traceId,
  actions
}: {
  title: string;
  subtitle: string;
  freshness?: string;
  traceId?: string;
  actions?: HeaderAction[];
}) {
  const nervous = useNervousSystem();
  const mode = getTruthModeCopy({ mode: nervous.mode });
  const activeTrace = traceId ?? nervous.trace_id;

  return (
    <header className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
          <p className="text-sm text-slate-300">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions?.slice(0, 3).map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={`rounded-lg border px-3 py-1.5 text-sm ${action.tone === 'primary' ? 'border-cyan-300/60 bg-cyan-400 text-slate-950' : 'border-white/20 text-slate-100 hover:bg-white/5'}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="rounded-full border border-white/15 px-2 py-1">{nervous.sport}</span>
        <span className="rounded-full border border-white/15 px-2 py-1">{nervous.date}</span>
        <span className="rounded-full border border-white/15 px-2 py-1">{nervous.tz}</span>
        <span className="rounded-full border border-white/15 px-2 py-1" title={mode.detail}>{mode.label}</span>
        <span>{freshness ? `Updated ${freshness}` : 'Updated just now'}</span>
        {activeTrace ? (
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(activeTrace)}
            className="rounded-full border border-white/15 px-2 py-1 text-slate-300"
            title="Copy trace id"
          >
            trace {activeTrace.slice(0, 12)}
          </button>
        ) : null}
      </div>
    </header>
  );
}
