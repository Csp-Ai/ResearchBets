'use client';

import React from 'react';
import Link from 'next/link';

import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { Surface } from '@/src/components/ui/surface';
import type { TrustedContextBundle } from '@/src/core/context/types';

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
  injuryWatch?: boolean;
  lineMoved?: boolean;
  riskFactors?: string[];
  dataSources?: {
    stats: 'live' | 'fallback';
    injuries: 'live' | 'fallback';
    odds: 'live' | 'fallback';
  };
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

export function VerdictHero({ confidence, weakestLeg, reasons, dataQuality }: { confidence: number; weakestLeg: AnalyzeLeg | null; reasons: string[]; dataQuality: 'Live stats' | 'Partial live' | 'Fallback-heavy' }) {
  const riskLabel = confidence >= 70 ? 'Strong' : confidence >= 55 ? 'Caution' : 'Weak';
  const tone = riskLabel === 'Strong' ? 'strong' : riskLabel === 'Caution' ? 'caution' : 'weak';
  const qualityTone = dataQuality === 'Live stats' ? 'strong' : dataQuality === 'Partial live' ? 'caution' : 'weak';

  return (
    <Surface kind="hero" className="space-y-5" data-testid="verdict-hero">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Verdict</p>
          <p className="text-5xl font-semibold leading-none md:text-6xl">{confidence}%</p>
          <p className="mt-1 text-sm text-muted">Confidence to clear as currently built.</p>
        </div>
        <div className="flex gap-2">
          <Chip tone={qualityTone}>{dataQuality}</Chip>
          <Chip tone={tone}>{riskLabel} confidence</Chip>
        </div>
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

function WhyDrawer({ leg, open, onClose, trustedContext }: { leg: AnalyzeLeg | null; open: boolean; onClose: () => void; trustedContext?: TrustedContextBundle }) {
  if (!open || !leg) return null;

  const row = (label: string, value: string) => <p><span className="text-muted">{label}:</span> {value}</p>;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/60 p-4" data-testid="why-drawer">
      <Surface className="w-full max-w-xl space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Why this leg is ranked here</h3>
            <p className="text-sm text-strong">{leg.selection}</p>
            <p className="text-xs text-muted">{leg.market ?? 'market n/a'} {leg.line ?? ''} {leg.odds ?? ''}</p>
          </div>
          <Button intent="secondary" onClick={onClose}>Close</Button>
        </div>

        <div className="text-sm text-subtle">
          {row('L5', `${leg.l5}%`)}
          {row('L10', `${leg.l10}%`)}
          {typeof leg.season === 'number' ? row('Season', `${leg.season}%`) : null}
          {typeof leg.vsOpp === 'number' ? row('vs Opp', `${leg.vsOpp}%`) : null}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Risk factors</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-strong">
            {(leg.riskFactors && leg.riskFactors.length > 0 ? leg.riskFactors : ['No downside drivers flagged.']).map((factor) => <li key={factor}>{factor}</li>)}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Provider provenance</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip tone={leg.dataSources?.stats === 'live' ? 'strong' : 'caution'}>Stats: {leg.dataSources?.stats ?? 'fallback'}</Chip>
            <Chip tone={leg.dataSources?.injuries === 'live' ? 'strong' : 'caution'}>Injuries: {leg.dataSources?.injuries ?? 'fallback'}</Chip>
            <Chip tone={leg.dataSources?.odds === 'live' ? 'strong' : 'caution'}>Odds: {leg.dataSources?.odds ?? 'fallback'}</Chip>
          </div>
          {(leg.dataSources?.stats === 'fallback' || leg.dataSources?.injuries === 'fallback' || leg.dataSources?.odds === 'fallback') ? (
            <p className="mt-2 text-xs text-muted">Some inputs are fallback; treat confidence as directional.</p>
          ) : null}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Trusted context</p>
          {(trustedContext?.items.length ?? 0) > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-strong">
              {trustedContext?.items.slice(0, 5).map((item) => (
                <li key={`${item.kind}-${item.headline}`} className="flex items-center justify-between gap-2 rounded border border-default px-2 py-1">
                  <span className="flex items-center gap-2"><Chip tone="strong">Verified</Chip>{item.headline}</span>
                  <span className="text-muted">{item.kind} · {new Date(item.asOf).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-muted">No verified update from trusted sources.</p>}
          {trustedContext?.coverage.injuries === 'none' ? <p className="mt-2 text-xs text-muted">Injury status unavailable from trusted providers right now; confidence adjusted.</p> : null}
        </div>

        <details>
          <summary className="text-xs uppercase tracking-wide text-muted">Unverified context (web)</summary>
          {(trustedContext?.unverifiedItems?.length ?? 0) > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-strong">
              {trustedContext?.unverifiedItems?.slice(0, 5).map((item) => (
                <li key={`${item.kind}-${item.headline}`} className="rounded border border-default px-2 py-1">
                  <div className="flex items-center gap-2"><Chip tone="caution">Unverified</Chip><span>{item.headline}</span></div>
                  {item.sources.length > 0 ? <p className="mt-1 text-[11px] text-muted">{item.sources.map((source) => {
                    try { return new URL(source.url ?? '').hostname; } catch { return source.label; }
                  }).join(', ')}</p> : null}
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-muted">No unverified web context.</p>}
        </details>
      </Surface>
    </div>
  );
}

export function ContextCoverageRow({ trustedContext }: { trustedContext?: TrustedContextBundle }) {
  const injuries = trustedContext?.coverage.injuries ?? 'none';
  const odds = trustedContext?.coverage.odds ?? 'none';
  const unverifiedCount = trustedContext?.unverifiedItems?.length ?? 0;

  const toneFor = (value: 'live' | 'fallback' | 'none') => value === 'live' ? 'strong' : value === 'fallback' ? 'caution' : 'weak';

  return (
    <Surface className="space-y-2" data-testid="context-coverage-row">
      <p className="text-xs uppercase tracking-wide text-muted">Context coverage</p>
      <div className="flex flex-wrap gap-2">
        <Chip tone={toneFor(injuries)}>Verified injuries: {injuries === 'live' ? 'full' : injuries === 'fallback' ? 'partial' : 'none'}</Chip>
        <Chip tone={toneFor(odds)}>Verified odds: {odds === 'live' ? 'full' : odds === 'fallback' ? 'partial' : 'none'}</Chip>
        <Chip tone={unverifiedCount > 0 ? 'caution' : 'strong'}>Unverified notes: {unverifiedCount > 0 ? `on (${unverifiedCount})` : 'off (0)'}</Chip>
      </div>
      {injuries === 'none' ? <p className="text-xs text-muted">No verified injury/suspension updates yet.</p> : null}
      {trustedContext?.fallbackReason ? <p className="text-xs text-muted">{trustedContext.fallbackReason}</p> : null}
    </Surface>
  );
}

export function LegCardCompact({ leg, onRemove, onWhy }: { leg: AnalyzeLeg; onRemove: () => void; onWhy: () => void }) {
  const tone = leg.risk === 'strong' ? 'strong' : leg.risk === 'caution' ? 'caution' : 'weak';

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-strong">{leg.selection}</p>
          <p className="text-xs text-muted">{leg.market} {leg.line} {leg.odds}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {leg.divergence ? <Chip tone="caution">Books disagree</Chip> : null}
          {leg.injuryWatch ? <Chip tone="caution">Injury watch</Chip> : null}
          {leg.lineMoved ? <Chip tone="caution">Line moved</Chip> : null}
          <Chip tone={tone}>{leg.risk}</Chip>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
        <span>L5 {leg.l5}%</span>
        <span>•</span>
        <span>L10 {leg.l10}%</span>
        {typeof leg.season === 'number' ? <><span>•</span><span>Season {leg.season}%</span></> : null}
        {typeof leg.vsOpp === 'number' ? <><span>•</span><span>vs Opp {leg.vsOpp}%</span></> : null}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button intent="secondary" onClick={onWhy}>Why</Button>
        <Button intent="secondary" onClick={onRemove}>Remove</Button>
      </div>
    </li>
  );
}

export function LegRankList({ legs, onRemove, trustedContext }: { legs: AnalyzeLeg[]; onRemove: (id: string) => void; trustedContext?: TrustedContextBundle }) {
  const [whyLegId, setWhyLegId] = React.useState<string | null>(null);
  const selectedLeg = legs.find((leg) => leg.id === whyLegId) ?? null;

  return (
    <>
      <ul className="divide-y divide-default" data-testid="leg-rank-list">
        {legs.map((leg) => <LegCardCompact key={leg.id} leg={leg} onRemove={() => onRemove(leg.id)} onWhy={() => setWhyLegId(leg.id)} />)}
      </ul>
      <WhyDrawer leg={selectedLeg} open={Boolean(selectedLeg)} onClose={() => setWhyLegId(null)} trustedContext={trustedContext} />
    </>
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
