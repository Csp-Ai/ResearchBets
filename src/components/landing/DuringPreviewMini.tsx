'use client';

export function DuringPreviewMini() {
  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-slate-900/70 p-3" data-testid="during-preview-mini">
      <p className="text-sm font-medium text-slate-100">DURING tracker snapshot</p>
      <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
        <li className="flex items-center justify-between rounded-md border border-white/10 bg-slate-950/30 px-2 py-1.5"><span>Jalen Brunson AST 6.5</span><span className="rounded border border-emerald-300/40 px-1.5 py-0.5 text-emerald-200">ahead</span></li>
        <li className="flex items-center justify-between rounded-md border border-white/10 bg-slate-950/30 px-2 py-1.5"><span>Jaylen Brown PTS 22.5</span><span className="rounded border border-amber-300/50 px-1.5 py-0.5 text-amber-200">pending</span></li>
      </ul>
    </div>
  );
}
