'use client';

import React from 'react';
import Link from 'next/link';

import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { Surface } from '@/src/components/ui/surface';

export type AnalyzeLeg = {
  id: string;
  selection: string;
  market?: string;
  line?: string;
  odds?: string;
  l5: number;
  l10: number;
  season?: number;
  vsOpp?: number;
  risk: 'strong' | 'caution' | 'weak';
  divergence?: boolean;
};

export type RecentRun = {
  traceId: string;
  updatedAt: string;
  status: 'running' | 'complete' | 'stale';
};

function shortTraceId(traceId: string): string {
  if (traceId.length <= 14) return traceId;
  return `${traceId.slice(0, 8)}…${traceId.slice(-4)}`;
}

export function EmptyStateBettor({ onPaste }: { onPaste: () => void }) {
  return (
    <Surface className="space-y-6" data-testid="research-empty-state">
      <div>
        <h2 className="text-xl font-semibold">From raw ticket to clear verdict</h2>
        <p className="mt-1 text-sm text-muted">Know your downside before placing the slip.</p>
      </div>
      <ul className="space-y-2 text-sm text-subtle">
        <li>• L5/L10 hit-rate context per leg</li>
        <li>• Weakest leg called out immediately</li>
        <li>• Line disagreement and injury risk flags</li>
      </ul>
      <pre className="ui-shell-panel p-4 text-xs text-subtle">
{`Jayson Tatum over 29.5 points (-110)
Luka Doncic over 8.5 assists (-120)
LeBron James over 6.5 rebounds (-105)`}
      </pre>
      <Button intent="primary" onClick={onPaste}>Paste slip</Button>
    </Surface>
  );
}

export function RecentActivityPanel({ runs, onOpen }: { runs: RecentRun[]; onOpen: (traceId: string) => void }) {
  return (
    <Surface className="space-y-4" data-testid="recent-activity-panel">
      <div>
        <h2 className="text-base font-semibold">Recent activity</h2>
        <p className="text-xs text-muted">Jump back into the latest runs without leaving Research.</p>
      </div>
      {runs.length === 0 ? (
        <div className="ui-shell-soft p-4 text-sm text-subtle">
          <p className="font-medium text-strong">No recent runs yet.</p>
          <p className="mt-1 text-xs text-muted">Paste a slip to start your first run and it will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {runs.map((run) => (
            <li key={run.traceId} className="ui-shell-list-item p-3">
              <div>
                <p className="font-medium text-strong">{shortTraceId(run.traceId)}</p>
                <p className="text-xs text-muted">{new Date(run.updatedAt).toLocaleString()} · {run.status}</p>
              </div>
              <Button intent="secondary" onClick={() => onOpen(run.traceId)}>Open</Button>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

export function HowItWorksMini() {
  return (
    <details className="ui-surface-card" data-testid="how-it-works">
      <summary className="cursor-pointer text-sm font-semibold text-strong">How it works</summary>
      <ul className="mt-3 space-y-2 text-sm text-subtle">
        <li>• Paste slip → Extract legs</li>
        <li>• Compute hit profiles (L5/L10/season/vsOpp)</li>
        <li>• Flag weakest leg + book disagreement</li>
      </ul>
    </details>
  );
}

export function VerdictHero({ confidence, weakestLeg, reasons }: { confidence: number; weakestLeg: AnalyzeLeg | null; reasons: string[] }) {
  const riskLabel = confidence >= 70 ? 'Strong' : confidence >= 55 ? 'Caution' : 'Weak';
  const tone = riskLabel === 'Strong' ? 'strong' : riskLabel === 'Caution' ? 'caution' : 'weak';

  return (
    <Surface kind="hero" className="space-y-5" data-testid="verdict-hero">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Verdict</p>
          <p className="text-5xl font-semibold leading-none md:text-6xl">{confidence}%</p>
          <p className="mt-1 text-sm text-muted">Confidence to clear as currently built.</p>
        </div>
        <Chip tone={tone}>{riskLabel} confidence</Chip>
      </div>

      <div className="ui-shell-soft p-4">
        <p className="text-xs uppercase tracking-wide text-subtle">Weakest leg</p>
        <p className="mt-1 text-lg text-danger">{weakestLeg?.selection ?? 'Not enough data yet'}</p>
      </div>

      <ul className="space-y-1.5 text-sm text-strong">
        {reasons.map((reason) => <li key={reason}>• {reason}</li>)}
      </ul>
    </Surface>
  );
}

export function LegCardCompact({ leg, onRemove }: { leg: AnalyzeLeg; onRemove: () => void }) {
  const tone = leg.risk === 'strong' ? 'strong' : leg.risk === 'caution' ? 'caution' : 'weak';

  return (
    <li className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 md:w-[34%]">
        <p className="truncate font-medium text-strong">{leg.selection}</p>
        <p className="text-xs text-muted">{leg.market} {leg.line} {leg.odds}</p>
      </div>

      <div className="flex flex-wrap gap-1.5 md:w-[38%]">
        <Chip>L5 {leg.l5}%</Chip>
        <Chip>L10 {leg.l10}%</Chip>
        {typeof leg.season === 'number' ? <Chip>Season {leg.season}%</Chip> : null}
        {typeof leg.vsOpp === 'number' ? <Chip>vs Opp {leg.vsOpp}%</Chip> : null}
      </div>

      <div className="flex items-center gap-2 md:w-[28%] md:justify-end">
        {leg.divergence ? <Chip tone="caution">Books disagree</Chip> : null}
        <Chip tone={tone}>{leg.risk}</Chip>
        <button className="text-xs text-link" type="button">Why</button>
        <button className="text-xs text-danger" type="button" onClick={onRemove}>Remove</button>
      </div>
    </li>
  );
}

export function LegRankList({ legs, onRemove }: { legs: AnalyzeLeg[]; onRemove: (id: string) => void }) {
  return (
    <ul className="divide-y divide-default">
      {legs.map((leg) => <LegCardCompact key={leg.id} leg={leg} onRemove={() => onRemove(leg.id)} />)}
    </ul>
  );
}

export function SlipActionsBar({ onRemoveWeakest, onRerun, canTrack }: { onRemoveWeakest: () => void; onRerun: () => void; canTrack: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button intent="primary" onClick={onRemoveWeakest}>Remove weakest</Button>
      <Button intent="secondary" onClick={onRerun}>Rerun</Button>
      {canTrack ? <Button intent="secondary">Track</Button> : null}
    </div>
  );
}

export function AdvancedDrawer({ children, developerMode }: { children: React.ReactNode; developerMode: boolean }) {
  const label = developerMode ? 'Run details (optional) (trace/provenance)' : 'Run details (optional)';

  return (
    <details className="ui-shell-drawer px-3 py-2" data-testid="advanced-drawer">
      <summary className="cursor-pointer text-xs font-semibold tracking-wide text-muted">{label}</summary>
      <div className="mt-3 space-y-2 text-xs text-subtle">{children}
        {developerMode ? <Link href="/traces" className="text-link underline">Open run details</Link> : null}
      </div>
    </details>
  );
}
