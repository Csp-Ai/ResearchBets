'use client';

import type { PreSubmitPatternWarning } from '@/src/core/slips/preSubmitPatternWarning';

const LEVEL_STYLES: Record<PreSubmitPatternWarning['warning_level'], string> = {
  high: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  medium: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  low: 'border-white/15 bg-slate-900/80 text-slate-200',
  none: 'border-white/15 bg-slate-900/80 text-slate-200'
};

const FIX_TYPE_LABELS = {
  lower_threshold: 'Lower threshold',
  reduce_correlation: 'Reduce correlation',
  swap_stat_type: 'Swap stat type',
  reduce_blowout_exposure: 'Reduce blowout exposure',
  trim_leg_count: 'Trim leg count'
} satisfies Record<PreSubmitPatternWarning['suggested_fixes'][number]['fix_type'], string>;

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export function PreSubmitPatternWarningCard({ warning }: { warning: PreSubmitPatternWarning }) {
  if (
    warning.warning_level === 'none' ||
    (warning.matched_patterns.length === 0 && !warning.learning_advisory)
  )
    return null;

  return (
    <section
      className={`rounded-xl border p-3 ${LEVEL_STYLES[warning.warning_level]}`}
      data-testid="pre-submit-pattern-warning"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/80">
            What similar settled tickets teach
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
      {warning.learning_advisory ? (
        <div className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-black/10 p-3 text-xs text-slate-200">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/80">
              Strongest repeated success
            </p>
            <p className="mt-1 text-sm text-slate-100">
              {warning.learning_advisory.strongest_repeated_success}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200/80">
              Most repeated break pattern
            </p>
            <p className="mt-1 text-sm text-slate-100">
              {warning.learning_advisory.repeated_break_pattern}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/80">
              Watch this before submitting
            </p>
            <p className="mt-1 text-sm text-cyan-100">{warning.learning_advisory.watch_note}</p>
          </div>
        </div>
      ) : null}
      <p className="mt-2 text-[11px] text-slate-400">
        Advisory only · Confidence{' '}
        {titleCase(warning.learning_advisory?.confidence_band ?? warning.confidence_level)}
      </p>
    </section>
  );
}

export function PreSubmitSuggestedFixesCard({ warning }: { warning: PreSubmitPatternWarning }) {
  if (warning.warning_level === 'none' || warning.suggested_fixes.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-cyan-400/20 bg-slate-950/80 p-3 text-slate-100"
      data-testid="pre-submit-suggested-fixes"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/80">Suggested fixes</p>
          <p className="mt-1 text-sm text-slate-300">
            Compact, advisory-only ways to lower risk without auto-editing this slip.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-300">
          {warning.suggested_fixes.length} option{warning.suggested_fixes.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {warning.suggested_fixes.slice(0, 3).map((fix) => (
          <li
            key={`${fix.fix_type}-${fix.affected_legs.join('-')}-${fix.title}`}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-50">{fix.title}</p>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                {FIX_TYPE_LABELS[fix.fix_type]}
              </span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">
                Confidence {titleCase(fix.confidence_level)}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-300">{fix.explanation}</p>
            <p className="mt-2 text-xs text-cyan-100">{fix.suggested_action}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
