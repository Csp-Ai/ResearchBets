'use client';

export function RunTraceCompact({ expanded, onToggle, stage, traceId }: { expanded: boolean; onToggle: () => void; stage: string; traceId?: string }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/50 p-3 lg:hidden">
      <button onClick={onToggle} className="flex w-full items-center justify-between text-left text-xs text-slate-200">
        <span>Run trace: {stage}</span>
        <span className="rounded border border-white/20 px-2 py-0.5 text-[10px]">{traceId ?? 'trace_demo'}</span>
      </button>
      {expanded ? <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] text-slate-300"><span className="rounded border border-white/15 px-2 py-1">Before</span><span className="rounded border border-white/15 px-2 py-1">Analyze</span><span className="rounded border border-white/15 px-2 py-1">During</span><span className="rounded border border-white/15 px-2 py-1">After</span></div> : null}
    </section>
  );
}
