'use client';

type Stage = 'Idle' | 'Before' | 'Analyze' | 'During' | 'After' | 'Complete';

export function RunTraceStrip({ stage, traceId }: { stage: Stage; traceId?: string }) {
  const stages: Stage[] = ['Before', 'Analyze', 'During', 'After', 'Complete'];
  const index = stages.indexOf(stage as Stage);
  return (
    <section className="hidden rounded-xl border border-white/10 bg-slate-900/50 p-3 lg:block">
      <div className="mb-2 text-sm text-slate-200">Run Trace {traceId ? <span className="text-xs text-slate-400">{traceId}</span> : null}</div>
      <div className="grid grid-cols-5 gap-2 text-xs">
        {stages.map((item, i) => <div key={item} className={`rounded border px-2 py-2 ${index >= i ? 'border-cyan-300/60 bg-cyan-400/10 text-cyan-100' : 'border-white/15 text-slate-400'}`}>{item}</div>)}
      </div>
    </section>
  );
}
