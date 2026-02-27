import type { ReactNode } from 'react';

export function AliveEmptyState({
  title,
  message,
  note,
  actions
}: {
  title: string;
  message: string;
  note?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-dashed border-white/20 bg-slate-900/50 p-4 text-sm text-slate-200">
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <p className="mt-1 text-sm text-slate-300">{message}</p>
      {note ? <p className="mt-2 text-xs text-slate-400">{note}</p> : null}
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}
