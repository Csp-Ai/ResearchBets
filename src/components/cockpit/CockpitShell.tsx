import type { ReactNode } from 'react';

export function CockpitShell({ children }: { children: ReactNode }) {
  return <section className="mx-auto w-full max-w-6xl space-y-4 px-2 pb-6">{children}</section>;
}

export function CockpitCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-slate-900/60 p-4 ${className}`}>{children}</div>;
}
