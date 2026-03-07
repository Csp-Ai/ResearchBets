import React from 'react';

type DecisionThreadStage = 'board' | 'staging' | 'analyze' | 'track';

const STAGES: Array<{ key: DecisionThreadStage; label: string }> = [
  { key: 'board', label: 'Board' },
  { key: 'staging', label: 'Staging' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'track', label: 'Track' }
];

export function DecisionThreadStrip({
  activeStage,
  contextLabel
}: {
  activeStage: DecisionThreadStage;
  contextLabel: string;
}) {
  return (
    <section className="rounded-lg border border-cyan-300/20 bg-cyan-500/5 px-3 py-2" aria-label="Decision thread strip">
      <div className="flex flex-wrap items-center gap-1.5">
        {STAGES.map((stage) => (
          <span
            key={stage.key}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              stage.key === activeStage
                ? 'border-cyan-300/70 bg-cyan-400/15 text-cyan-100'
                : 'border-white/15 text-slate-400'
            }`}
          >
            {stage.label}
          </span>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-slate-300">{contextLabel}</p>
    </section>
  );
}
