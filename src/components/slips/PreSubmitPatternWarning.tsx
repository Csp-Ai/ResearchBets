'use client';

import type { PreSubmitPatternWarning } from '@/src/core/slips/preSubmitPatternWarning';

const LEVEL_STYLES: Record<PreSubmitPatternWarning['warning_level'], string> = {
  high: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  medium: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  low: 'border-white/15 bg-slate-900/80 text-slate-200',
  none: 'border-white/15 bg-slate-900/80 text-slate-200'
};

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export function PreSubmitPatternWarningCard({
  warning
}: {
  warning: PreSubmitPatternWarning;
}) {
  if (warning.warning_level === 'none' || warning.matched_patterns.length === 0) return null;

  return (
    <section
      className={`rounded-xl border p-3 ${LEVEL_STYLES[warning.warning_level]}`}
      data-testid="pre-submit-pattern-warning"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/80">
            Pre-submit pattern check
          </p>
          <p className="mt-1 text-sm">{warning.recommendation_summary}</p>
        </div>
        <span className="rounded-full border border-white/10 px-2 py-1 text-[11px]">
          {warning.sample_size} reviewed {warning.sample_size === 1 ? 'slip' : 'slips'}
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-slate-300">
        {warning.matched_patterns.slice(0, 3).map((pattern) => (
          <li key={`${pattern.tag}-${pattern.reason}`}>
            <span className="font-medium text-slate-100">{titleCase(pattern.tag)}:</span>{' '}
            {pattern.reason}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-400">
        Advisory only · Confidence {titleCase(warning.confidence_level)}
      </p>
    </section>
  );
}
