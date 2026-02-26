import type { TodayMode } from '@/src/core/today/types';

type ModeBadgeProps = {
  mode: TodayMode;
  reason?: string;
  generatedAt?: string;
  className?: string;
};

const toneByMode: Record<TodayMode, string> = {
  live: 'border-emerald-300/40 bg-emerald-400/10 text-emerald-100',
  cache: 'border-amber-300/40 bg-amber-400/10 text-amber-100',
  demo: 'border-cyan-300/40 bg-cyan-400/10 text-cyan-100',
};

const labelByMode: Record<TodayMode, string> = {
  live: 'LIVE',
  cache: 'CACHED',
  demo: 'DEMO',
};

const tooltipByMode = (mode: TodayMode, reason?: string, generatedAt?: string) => {
  if (mode === 'demo') {
    return 'Demo mode (live feeds off). Deterministic slate is shown so you can still browse and run research.';
  }
  if (mode === 'cache') {
    return `Cached feed snapshot${reason ? ` (${reason})` : ''}${generatedAt ? ` · generated ${generatedAt}` : ''}.`;
  }
  return `Live feeds active${generatedAt ? ` · generated ${generatedAt}` : ''}.`;
};

export function ModeBadge({ mode, reason, generatedAt, className }: ModeBadgeProps) {
  return (
    <span
      title={tooltipByMode(mode, reason, generatedAt)}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneByMode[mode]} ${className ?? ''}`}
    >
      {labelByMode[mode]}
    </span>
  );
}
