'use client';

import React, { useMemo, useState } from 'react';

import type { Run } from '@/src/core/run/types';
import { Button } from '@/src/components/ui/button';
import { Surface } from '@/src/components/ui/surface';

const riskText = (riskBand?: 'low' | 'moderate' | 'high'): 'Strong' | 'Caution' | 'Weak' => {
  if (riskBand === 'high') return 'Weak';
  if (riskBand === 'moderate') return 'Caution';
  return 'Strong';
};

const cleanFlag = (value?: string | null) => (value ? value : 'Unknown');

const buildLegBullet = (run: Run, extractedLegId: string): string => {
  const extracted = run.extractedLegs.find((leg) => leg.id === extractedLegId);
  const enriched = run.enrichedLegs.find((leg) => leg.extractedLegId === extractedLegId);
  if (!extracted || !enriched) return '- Unknown leg — data unavailable';

  const flags = [
    `Injury ${cleanFlag(enriched.flags.injury)}`,
    `News ${cleanFlag(enriched.flags.news)}`,
    `Line move ${typeof enriched.flags.lineMove === 'number' ? enriched.flags.lineMove : 'Unknown'}`,
    `Book divergence ${typeof enriched.flags.divergence === 'number' ? enriched.flags.divergence : 'Unknown'}`
  ].join(', ');

  return `- ${extracted.selection} — L5 ${enriched.l5}% / L10 ${enriched.l10}% / Risk ${riskText(enriched.riskBand)}; ${flags}`;
};

const getRankedIds = (run: Run): string[] => {
  return [...run.enrichedLegs]
    .sort((left, right) => (right.riskScore ?? 0) - (left.riskScore ?? 0))
    .map((leg) => leg.extractedLegId);
};

export const buildPerLegBullets = (run: Run): string => {
  return getRankedIds(run).map((id) => buildLegBullet(run, id)).join('\n');
};

export const buildGroupReply = (run: Run): string => {
  const rankedIds = getRankedIds(run);
  const weakestId = run.analysis.weakestLegId ?? rankedIds[0];
  const weakestLeg = run.extractedLegs.find((leg) => leg.id === weakestId);
  const weakestRisk = run.enrichedLegs.find((leg) => leg.extractedLegId === weakestId)?.riskBand;

  const lines = [
    `ResearchBets verdict: ${run.analysis.confidencePct}% (${run.analysis.riskLabel})`,
    `Weakest leg: ${weakestLeg?.selection ?? 'Unknown'}`,
    '',
    buildPerLegBullets(run)
  ];

  if (weakestRisk === 'high' || weakestRisk === 'moderate') {
    lines.push('', 'Suggestion: remove weakest and re-run');
  }

  lines.push('', 'What would change this');

  if (run.sources.injuries === 'fallback') {
    lines.push('- Any injuries/suspensions we should know about?');
  }

  if (run.sources.odds === 'fallback') {
    lines.push('- What book/odds did you take? Any line movement?');
  }

  lines.push('', `Data sources: stats=${run.sources.stats}, injuries=${run.sources.injuries}, odds=${run.sources.odds}`);

  if (run.metadata?.crowdNotes?.trim()) {
    lines.push(`Crowd notes (unverified): ${run.metadata.crowdNotes.trim()}`);
  }

  return lines.join('\n');
};

interface ShareReplyProps {
  run: Run;
}

export function ShareReply({ run }: ShareReplyProps) {
  const [status, setStatus] = useState<string | null>(null);
  const replyText = useMemo(() => buildGroupReply(run), [run]);
  const perLeg = useMemo(() => buildPerLegBullets(run), [run]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied');
    } catch {
      setStatus('Copy failed');
    }
  };

  return (
    <Surface className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Reply to group chat</h2>
        <div className="flex flex-wrap gap-2">
          <Button intent="primary" onClick={() => void copyText(replyText)}>Copy reply</Button>
          <Button intent="secondary" onClick={() => void copyText(perLeg)}>Copy per-leg bullets</Button>
        </div>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border border-default bg-canvas p-3 text-sm">{replyText}</pre>
      {status ? <p className="text-xs text-slate-400">{status}</p> : null}
    </Surface>
  );
}
