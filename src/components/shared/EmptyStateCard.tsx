import React from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function EmptyStateCard({
  title,
  guidance,
  primaryCta,
  secondaryCta,
  icon,
}: {
  title: string;
  guidance: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-4 text-sm">
      <div className="flex items-start gap-3">
        {icon ? <div className="text-slate-300">{icon}</div> : null}
        <div>
          <p className="font-medium text-slate-100">{title}</p>
          <p className="mt-1 text-slate-400">{guidance}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {primaryCta ? <Link href={primaryCta.href} className="rounded bg-cyan-600 px-3 py-1.5 text-xs font-medium">{primaryCta.label}</Link> : null}
            {secondaryCta ? <Link href={secondaryCta.href} className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-200">{secondaryCta.label}</Link> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
