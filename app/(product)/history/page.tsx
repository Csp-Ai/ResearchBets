'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

type HistoryPayload = {
  credibility: { label: string; detail: string };
  coverage: {
    counts: { artifacts: number; verifiedArtifacts: number; reviewNeededArtifacts: number; parseFailedArtifacts: number; demoFallbackArtifacts: number; verifiedSettledSlips: number };
    overall: { verified: { percent: number }; reviewNeeded: { count: number }; parseFailedOrMissing: { count: number }; demoFallback: { count: number } };
    labels: { history: { label: string; detail: string }; postmortem: { label: string; detail: string } };
    reviewNext: Array<{ code: string; label: string; detail: string; priority: 'high' | 'medium' | 'low' }>;
  };
  artifacts: Array<{ artifact_id: string; artifact_type: string; source_sportsbook: string | null; upload_timestamp: string; verification_status: string; parse_status: string; parser_confidence_label?: string; parser_adapter?: string | null; parser_warnings_json?: Array<{ message: string }> | null }>;
  slips: Array<{ slip_id: string; source_artifact_id: string | null; sportsbook: string | null; status: string; leg_count: number; verification_status: string; created_at: string; legs: Array<{ normalized_market_label: string | null; market_type: string | null }> }>;
  accountActivity: Array<{ activity_import_id: string; source_artifact_id: string | null; source_sportsbook: string | null; verification_status: string; activity_window_start: string | null; activity_window_end: string | null }>;
  postmortems: Array<{ postmortem_id: string; outcome_summary: string; advisory_tags: string[]; created_at: string; confidence_score: number | null; evidence: Array<{ basis: string; note: string }>; credibility?: { label: string; detail: string; verified_settled_slips: number; unverified_settled_slips: number; demo_settled_slips: number } }>;
};

const verificationOptions = ['', 'verified', 'needs_review', 'parsed_demo', 'parsed_unverified', 'rejected'];

export default function HistoryPage() {
  const nervous = useNervousSystem();
  const [payload, setPayload] = useState<HistoryPayload | null>(null);
  const [sportsbook, setSportsbook] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (sportsbook) params.set('sportsbook', sportsbook);
    if (verificationStatus) params.set('verification_status', verificationStatus);
    return params.toString();
  }, [sportsbook, verificationStatus]);

  useEffect(() => {
    void fetch(`/api/bettor-memory/history${query ? `?${query}` : ''}`, { cache: 'no-store' }).then((res) => res.json()).then(setPayload);
  }, [query]);

  return (
    <section className="mx-auto max-w-6xl space-y-4 py-4 pb-24">
      <header className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Bettor history archive</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">Saved uploads, review-needed artifacts, verified records, and post-mortems</h1>
        <p className="mt-2 text-sm text-slate-300">Review queues stay explicit so bettor memory can prefer trustworthy records without erasing the raw evidence.</p>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          <p className="font-medium text-slate-100">{payload?.credibility.label ?? 'Loading...'}</p>
          <p className="mt-1">{payload?.credibility.detail ?? 'Loading archive basis.'}</p>
        </div>
      </header>

      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Archive credibility</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-100">{payload?.coverage.labels.history.label ?? 'Loading archive credibility'}</h2>
            <p className="mt-1 text-sm text-slate-300">{payload?.coverage.labels.history.detail ?? 'Loading coverage explanation.'}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right text-xs text-slate-300">
            <p className="font-medium text-slate-100">{payload ? `${payload.coverage.overall.verified.percent}% verified artifacts` : '—'}</p>
            <p>{payload ? `${payload.coverage.counts.reviewNeededArtifacts} artifacts still need review` : 'Loading review queue'}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {[
            ['Total artifacts', payload ? String(payload.coverage.counts.artifacts) : '—'],
            ['Verified artifacts', payload ? String(payload.coverage.counts.verifiedArtifacts) : '—'],
            ['Review-needed artifacts', payload ? String(payload.coverage.counts.reviewNeededArtifacts) : '—'],
            ['Parse-failed artifacts', payload ? String(payload.coverage.counts.parseFailedArtifacts) : '—'],
            ['Demo/fallback artifacts', payload ? String(payload.coverage.counts.demoFallbackArtifacts) : '—'],
          ].map(([label, value]) => (
            <article key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">{value}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
            <p className="font-medium text-slate-100">Where review effort helps most</p>
            <p className="mt-2">{payload?.coverage.labels.postmortem.detail ?? 'Loading post-mortem coverage.'}</p>
            <p className="mt-2">Verified settled slips: {payload?.coverage.counts.verifiedSettledSlips ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
            <p className="font-medium text-slate-100">Review next</p>
            <div className="mt-2 space-y-2">
              {(payload?.coverage.reviewNext ?? []).slice(0, 4).map((item) => (
                <div key={item.code} className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
                  <p className="font-medium text-slate-100">{item.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{item.priority} priority</p>
                  <p className="mt-2 text-xs">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm">
        <input className="rounded border border-white/20 bg-slate-950 px-3 py-2" placeholder="Filter sportsbook" value={sportsbook} onChange={(e) => setSportsbook(e.target.value)} />
        <select className="rounded border border-white/20 bg-slate-950 px-3 py-2" value={verificationStatus} onChange={(e) => setVerificationStatus(e.target.value)}>
          {verificationOptions.map((option) => <option key={option || 'all'} value={option}>{option ? option.replace(/_/g, ' ') : 'All verification states'}</option>)}
        </select>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Artifacts</h2>
            <span className="text-xs text-slate-400">Open any artifact to review the screenshot and parsed structure.</span>
          </div>
          <div className="mt-3 space-y-2">
            {(payload?.artifacts ?? []).map((artifact) => (
              <Link key={artifact.artifact_id} href={appendQuery(nervous.toHref(`/history/${artifact.artifact_id}`), {})} className="block rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300 hover:border-cyan-400/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-100">{artifact.artifact_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs">{artifact.source_sportsbook ?? 'Sportsbook unknown'} · {artifact.parse_status} · {artifact.verification_status}</p>
                    <p className="mt-1 text-[11px] text-slate-400">Parser: {artifact.parser_adapter ? artifact.parser_adapter.replace(/_/g, ' ') : 'pending'}{artifact.parser_warnings_json?.length ? ` · ${artifact.parser_warnings_json.length} warning${artifact.parser_warnings_json.length === 1 ? '' : 's'}` : ''}</p>
                    <p className="mt-1 text-xs">Uploaded {new Date(artifact.upload_timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] ${artifact.verification_status === 'verified' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'}`}>{artifact.parser_confidence_label ?? 'unknown'} confidence</span>
                </div>
              </Link>
            ))}
            {payload?.artifacts?.length === 0 ? <p className="text-sm text-slate-400">No uploads saved yet.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Parsed / verified slips</h2>
          <div className="mt-3 space-y-2">
            {(payload?.slips ?? []).map((slip) => (
              <article key={slip.slip_id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-100">{slip.sportsbook ?? 'Sportsbook unknown'} · {slip.leg_count}-leg slip</p>
                    <p className="text-xs">{slip.status} · {slip.verification_status}</p>
                    <p className="mt-1 text-xs">Markets: {slip.legs.map((leg) => leg.normalized_market_label ?? leg.market_type ?? 'Unknown').join(', ')}</p>
                  </div>
                  {slip.source_artifact_id ? <Link className="rounded border border-white/20 px-3 py-2 text-xs" href={appendQuery(nervous.toHref(`/history/${slip.source_artifact_id}`), {})}>Open artifact</Link> : null}
                </div>
              </article>
            ))}
            {payload?.slips?.length === 0 ? <p className="text-sm text-slate-400">No parsed slips yet.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Account activity imports</h2>
          <div className="mt-3 space-y-2">
            {(payload?.accountActivity ?? []).map((item) => (
              <article key={item.activity_import_id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-100">{item.source_sportsbook ?? 'Sportsbook unknown'}</p>
                    <p className="text-xs">{item.verification_status}</p>
                    <p className="mt-1 text-xs">Window {item.activity_window_start?.slice(0, 10) ?? '—'} → {item.activity_window_end?.slice(0, 10) ?? '—'}</p>
                  </div>
                  {item.source_artifact_id ? <Link className="rounded border border-white/20 px-3 py-2 text-xs" href={appendQuery(nervous.toHref(`/history/${item.source_artifact_id}`), {})}>Review import</Link> : null}
                </div>
              </article>
            ))}
            {payload?.accountActivity?.length === 0 ? <p className="text-sm text-slate-400">No account activity imports yet.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Post-mortems</h2>
          <div className="mt-3 space-y-2">
            {(payload?.postmortems ?? []).map((item) => (
              <article key={item.postmortem_id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                <p className="font-medium text-slate-100">{item.outcome_summary}</p>
                <p className="mt-1 text-xs">Signals: {item.advisory_tags.join(', ') || 'No deterministic tags yet'}</p>
                <p className="mt-1 text-xs">Evidence: {(item.evidence?.[0]?.basis ?? 'unknown').replace(/_/g, ' ')}</p>
                {item.credibility ? <p className="mt-1 text-xs">{item.credibility.label} · {item.credibility.verified_settled_slips} verified / {item.credibility.unverified_settled_slips} unverified</p> : null}
                <p className="mt-1 text-xs">Created {new Date(item.created_at).toLocaleString()}</p>
              </article>
            ))}
            {payload?.postmortems?.length === 0 ? <p className="text-sm text-slate-400">No stored post-mortems yet.</p> : null}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-slate-950/95 p-3">
        <div className="mx-auto flex max-w-6xl gap-2">
          <Link className="flex-1 rounded bg-cyan-400 px-3 py-2 text-center text-sm font-semibold text-slate-950" href={appendQuery(nervous.toHref('/ingest'), { source: 'archive' })}>Upload artifact</Link>
          <Link className="flex-1 rounded border border-white/20 px-3 py-2 text-center text-sm" href={appendQuery(nervous.toHref('/profile'), {})}>Open performance</Link>
        </div>
      </div>
    </section>
  );
}
