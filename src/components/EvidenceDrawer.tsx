'use client';

import { useEffect, useMemo, useState } from 'react';

import { useDialogA11y } from '@/src/components/shared/useDialogA11y';

import type { ControlPlaneEvent, GraphNodeDefinition } from '@/src/components/AgentNodeGraph';
import { validateCopyPolicyInDev } from '@/src/core/policy/copyPolicyDevValidator';

type EvidenceDrawerProps = {
  open: boolean;
  node?: GraphNodeDefinition;
  events: ControlPlaneEvent[];
  onClose: () => void;
};

const PROVENANCE_FIELDS = [
  'source_domain',
  'source_url',
  'fetched_at',
  'published_at',
  'freshness_score',
  'staleness_ms'
] as const;

const DECISION_CARD_COPY = [
  'Decision fields',
  'Select a node or event to inspect provenance details.',
  'Volatile: model tagged this node as high-variance.',
  'Volatile: confidence is below the trust threshold.'
] as const;

const DECISION_FIELDS = ['confidence', 'rationale', 'evidence_refs', 'evidence_refs_ids'] as const;

type EvidenceTab = 'stats' | 'matchup' | 'rationale';

function formatTime(value?: string) {
  if (!value) return 'N/A';
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? new Date(ms).toLocaleString() : value;
}

function eventMatchesNode(nodeId: string, event: ControlPlaneEvent): boolean {
  const payload = event.payload ?? {};
  const agent = payload.agent_id ?? payload.agentId ?? payload.agent;
  if (nodeId === 'decision') return event.event_name.includes('decision');
  if (nodeId === 'outcome')
    return ['game_result_ingested', 'user_outcome_recorded'].includes(event.event_name);
  if (nodeId === 'edge_report') return event.event_name === 'edge_report_generated';
  if (nodeId === 'odds') return event.event_name === 'odds_snapshot_captured';
  if (nodeId === 'slip')
    return event.event_name === 'slip_submitted' || event.event_name === 'slip_extracted';
  if (nodeId === 'wal_search' || nodeId === 'wal_fetch')
    return event.event_name.startsWith('external_fetch_');
  if (nodeId === 'wal_normalize') return event.event_name === 'data_normalized';
  return typeof agent === 'string' && agent === nodeId;
}

function renderFieldList(payload: Record<string, unknown>, fields: readonly string[]) {
  const rows = fields.filter((field) => payload[field] !== undefined);
  if (rows.length === 0)
    return <p className="text-xs text-slate-500">No provenance fields available for this event.</p>;
  return (
    <dl className="grid gap-1 text-xs">
      {rows.map((field) => (
        <div key={field} className="grid grid-cols-[120px_1fr] gap-2">
          <dt className="text-slate-400">{field}</dt>
          <dd className="break-all text-slate-200">{String(payload[field])}</dd>
        </div>
      ))}
    </dl>
  );
}

function riskReason(payload: Record<string, unknown>): string | null {
  const riskTag = typeof payload.risk_tag === 'string' ? payload.risk_tag.toLowerCase() : '';
  const rationale = typeof payload.rationale === 'string' ? payload.rationale : '';
  if (riskTag === 'high') {
    return `Volatile: model tagged this node as high-variance. ${rationale || 'Prefer a lower line or smaller stake.'}`;
  }
  const confidence = typeof payload.confidence === 'number' ? payload.confidence : null;
  if (confidence !== null && confidence < 0.55) {
    return `Volatile: confidence is ${Math.round(confidence * 100)}%, which is below the trust threshold.`;
  }
  return null;
}

export function EvidenceDrawer({ open, node, events, onClose }: EvidenceDrawerProps) {
  const [activeTab, setActiveTab] = useState<EvidenceTab>('stats');
  const drawerRef = useDialogA11y(open, onClose);

  useEffect(() => {
    validateCopyPolicyInDev([
      {
        id: 'decision.card.evidence.drawer',
        surface: 'decision-card',
        file: 'src/components/EvidenceDrawer.tsx',
        strings: DECISION_CARD_COPY
      }
    ]);
  }, []);

  const matching = node ? events.filter((event) => eventMatchesNode(node.id, event)) : [];
  const recent = matching.slice(-10).reverse();
  const last = recent[0];
  const payload = (last?.payload ?? {}) as Record<string, unknown>;
  const volatileReason = riskReason(payload);

  const tabFields = useMemo(
    () => ({
      stats: ['confidence', 'freshness_score', 'staleness_ms', 'line_delta', 'hit_rate'] as const,
      matchup: [
        'source_domain',
        'source_url',
        'opponent',
        'defense_rank',
        'injury_context'
      ] as const,
      rationale: ['rationale', 'risk_tag', 'evidence_refs', 'evidence_refs_ids'] as const
    }),
    []
  );

  return (
    <aside
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Evidence drawer"
      tabIndex={-1}
      className={`fixed right-0 top-0 z-40 h-full w-full max-w-md transform border-l border-slate-800 bg-slate-950/95 p-4 shadow-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Evidence</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close evidence drawer"
          className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
        >
          Close
        </button>
      </div>

      {node ? (
        <div className="mt-3 space-y-3">
          <div className="rounded border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs text-slate-400">Node</p>
            <p className="text-sm font-medium text-cyan-200">{node.label}</p>
            <p className="mt-1 text-xs text-slate-400">
              Last event: {last?.event_name ?? 'none'} at {formatTime(last?.created_at)}
            </p>
            {volatileReason ? (
              <p className="mt-2 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-200">
                {volatileReason}
              </p>
            ) : null}
          </div>

          <section className="rounded border border-slate-800 bg-slate-900/70 p-3">
            <div className="mb-2 flex items-center gap-2">
              {(['stats', 'matchup', 'rationale'] as EvidenceTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded border px-2 py-1 text-xs capitalize ${
                    activeTab === tab
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200'
                      : 'border-slate-700 text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {renderFieldList(payload, tabFields[activeTab])}
          </section>

          <section className="rounded border border-slate-800 bg-slate-900/70 p-3">
            <h3 className="mb-2 text-xs font-semibold text-slate-200">Provenance</h3>
            {renderFieldList(payload, PROVENANCE_FIELDS)}
          </section>

          <section className="rounded border border-slate-800 bg-slate-900/70 p-3">
            <h3 className="mb-2 text-xs font-semibold text-slate-200">Decision fields</h3>
            {renderFieldList(payload, DECISION_FIELDS)}
          </section>

          <section className="rounded border border-slate-800 bg-slate-900/70 p-3">
            <h3 className="text-xs font-semibold text-slate-200">Last 10 events</h3>
            <div className="mt-2 space-y-2">
              {recent.length === 0 ? (
                <p className="text-xs text-slate-500">No events for this node yet.</p>
              ) : null}
              {recent.map((event, index) => (
                <details
                  key={`${event.event_name}-${event.created_at ?? index}`}
                  className="rounded border border-slate-800 bg-slate-950/60 p-2"
                >
                  <summary className="cursor-pointer text-xs text-slate-200">
                    {event.event_name} · {formatTime(event.created_at)}
                  </summary>
                  <pre className="mt-2 overflow-x-auto text-[11px] text-slate-400">
                    {JSON.stringify(event.payload ?? {}, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">
          Select a node or event to inspect provenance details.
        </p>
      )}
    </aside>
  );
}
