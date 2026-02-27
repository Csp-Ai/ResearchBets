'use client';

import React from 'react';

import { Chip } from '@/src/components/landing/ui';

type AlivePhase = {
  label: string;
  status: 'complete' | 'active' | 'queued';
};

export function AliveStrip({
  mode,
  reason,
  phases
}: {
  mode: 'demo' | 'live' | 'cache';
  reason?: string;
  phases: AlivePhase[];
}) {
  const modeNote = mode === 'demo'
    ? 'Feeds off (demo)'
    : reason === 'provider_unavailable'
      ? 'Using cached slate'
      : mode === 'cache'
        ? 'Using cached slate'
        : 'Live board signals';

  return (
    <div className="mt-2 space-y-1.5" data-testid="alive-strip">
      <div className="flex flex-wrap items-center gap-1.5">
        {phases.map((phase) => (
          <Chip key={phase.label} variant={phase.status === 'complete' ? 'good' : 'neutral'}>
            {phase.label}
          </Chip>
        ))}
      </div>
      <p className="text-xs text-slate-400">{modeNote}</p>
    </div>
  );
}
