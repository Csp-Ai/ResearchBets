import type { ProviderHealth, TodayLiveStep } from '@/src/core/today/types';

type PipelineStripProps = {
  mode: 'live' | 'cache' | 'demo';
  landingReason?: 'live_ok' | 'missing_keys' | 'provider_unavailable' | 'demo';
  providerWarnings?: string[];
  debug?: { step: TodayLiveStep; hint: string; statusCode?: number };
  providerHealth?: ProviderHealth[];
};

const PHASES: Array<{ key: TodayLiveStep; label: string }> = [
  { key: 'resolve_context', label: 'Context' },
  { key: 'events_fetch', label: 'Events' },
  { key: 'odds_fetch', label: 'Odds' },
  { key: 'stats_fetch', label: 'Stats' },
  { key: 'board_build', label: 'Build' },
  { key: 'live_viability', label: 'Viability' },
];

function deriveStepFromWarnings(providerWarnings: string[] = []): TodayLiveStep | null {
  for (const warning of providerWarnings) {
    if (!warning.startsWith('live_unavailable:') && !warning.startsWith('live_hard_error:')) continue;
    const step = warning.split(':').at(-1) as TodayLiveStep | undefined;
    if (step && PHASES.some((phase) => phase.key === step)) return step;
  }
  return null;
}

function summaryLabel(input: Pick<PipelineStripProps, 'mode' | 'landingReason' | 'providerWarnings'>): string {
  const warningStep = deriveStepFromWarnings(input.providerWarnings);
  if (input.mode === 'demo') return 'Demo mode (live feeds off)';
  if (input.mode === 'cache') return 'Using cached slate';
  if (warningStep === 'events_fetch') return 'Live unavailable (provider events)';
  if (input.landingReason === 'provider_unavailable') return 'Using cached slate';
  return 'Live OK';
}

export function PipelineStrip({ mode, landingReason, providerWarnings, debug, providerHealth }: PipelineStripProps) {
  const activeStep = debug?.step ?? deriveStepFromWarnings(providerWarnings) ?? (mode === 'live' ? 'live_viability' : 'resolve_context');
  const summary = summaryLabel({ mode, landingReason, providerWarnings });
  const healthyCount = providerHealth?.filter((item) => item.ok).length ?? 0;

  return (
    <section className="pipeline-strip-shell" aria-label="Pipeline strip" data-testid="pipeline-strip">
      <div className="pipeline-strip-row">
        {PHASES.map((phase) => (
          <span key={phase.key} className={`pipeline-chip ${activeStep === phase.key ? 'active' : ''}`}>
            {phase.label}
          </span>
        ))}
      </div>
      <p className="pipeline-strip-summary">
        {summary}
        {providerHealth ? <span className="pipeline-strip-health"> · Providers {healthyCount}/{providerHealth.length}</span> : null}
      </p>
    </section>
  );
}
