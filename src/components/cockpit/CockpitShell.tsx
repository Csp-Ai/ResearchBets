import type { ReactNode } from 'react';

export function CockpitShell({ children }: { children: ReactNode }) {
  return <section className="cockpit-shell">{children}</section>;
}

export function CockpitCard({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`rounded-2xl border border-white/10 bg-slate-900/60 p-4 ${className}`}>{children}</div>;
}
