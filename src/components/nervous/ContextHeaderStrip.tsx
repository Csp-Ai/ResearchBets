'use client';

import { usePathname, useRouter } from 'next/navigation';

import { useNervousSystem } from './NervousSystemContext';

const SPORTS = ['NBA', 'NFL', 'NHL', 'MLB', 'UFC'];
const TIMEZONES = ['America/Phoenix', 'America/Denver', 'America/New_York'];

export function ContextHeaderStrip({ lastUpdatedLabel }: { lastUpdatedLabel?: string }) {
  const nervous = useNervousSystem();
  const router = useRouter();
  const pathname = usePathname();

  const onChange = (overrides: Record<string, string>) => {
    router.push(nervous.toHref(pathname ?? '/', overrides));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
      <span className="font-medium text-white">{nervous.sport}</span>
      <span>{nervous.date}</span>
      <span>{nervous.tz}</span>
      <span className="rounded border border-cyan-500/40 px-1.5 py-0.5">{nervous.mode}</span>
      <span>{lastUpdatedLabel ?? 'Updated just now'}</span>
      <select className="ml-auto rounded border border-white/20 bg-slate-900 px-2 py-1" value={nervous.sport} onChange={(event) => onChange({ sport: event.target.value })}>
        {SPORTS.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
      </select>
      <select className="rounded border border-white/20 bg-slate-900 px-2 py-1" value={nervous.tz} onChange={(event) => onChange({ tz: event.target.value })}>
        {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
      </select>
    </div>
  );
}
