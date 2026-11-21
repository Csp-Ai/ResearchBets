'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { SUPPORTED_MARKET_TYPES, type MarketType } from '@/src/core/markets/marketType';
import type { TicketEvidence, TicketEvidenceRequest, TicketEvidenceResponse } from '@/src/core/run/ticketEvidence';
import type { ConfirmedIngestionLeg, DraftSlipIngestion } from '@/src/core/slips/draftSlipStore';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';
import { screenshotCoverage } from '@/src/core/track/screenshotTicketMetadata';

const modeLabel = {
  full: 'Full Ticket X-Ray',
  research_only: 'Research-Only X-Ray',
  incomplete: 'Incomplete Ticket Review'
};

const label = 'text-xs font-semibold uppercase tracking-wider text-cyan-100/80';
const linkStyle = 'inline-flex min-h-11 items-center font-semibold text-cyan-100 underline underline-offset-4';

function description(leg: ConfirmedIngestionLeg): string {
  const market = leg.marketLabel ?? leg.marketType.replace(/_/g, ' ');
  if (leg.unsupportedMarket || leg.contractSide || leg.marketType === 'moneyline') {
    return [leg.player, market, leg.quotedContractPercent != null ? `${leg.quotedContractPercent}% screenshot quote` : null].filter(Boolean).join(' · ');
  }
  const direction = leg.ladder ? `${leg.threshold}+` : `${leg.direction === 'under' ? 'Under' : 'Over'} ${leg.threshold}`;
  return `${leg.player} · ${market} · ${direction}`;
}

const displayTime = (date: string) => {
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : date;
};

function EvidenceDetails({ evidence, pending, leg }: {
  evidence?: TicketEvidence; pending: boolean; leg: ConfirmedIngestionLeg;
}) {
  if (leg.unsupportedMarket) return <p>Data unavailable. This exact contract requires a dedicated market adapter.</p>;
  if (pending) return <p role="status">Checking authorized data sources…</p>;

  return (
    <div className="space-y-2">
      <p><strong>Matchup and schedule.</strong>{' '}
        {evidence?.event
          ? `Possible schedule match: ${evidence.event.matchup} on ${displayTime(evidence.event.eventDate)}. ${evidence.event.source} · ${evidence.event.freshness} · retrieved ${displayTime(evidence.event.retrievedAt)}. Confirm the date on your ticket.`
          : 'Data unavailable. A scheduled event could not be matched.'}
        {' '}Rest and venue context require independent verification.
      </p>
      <p><strong>Injuries and availability.</strong>{' '}
        {evidence?.injuries
          ? `${evidence.injuries.report}. ${evidence.injuries.source} · ${evidence.injuries.freshness} · updated ${displayTime(evidence.injuries.updatedAt)} · retrieved ${displayTime(evidence.injuries.retrievedAt)}. Confirm status for your event.`
          : 'Data unavailable. Availability for this event could not be verified.'}
      </p>
      <div>
        <p><strong>Historical statistics.</strong>{' '}
          {evidence?.history
            ? `${evidence.history.source} · ${evidence.history.freshness} · retrieved ${displayTime(evidence.history.retrievedAt)}.`
            : 'Data unavailable. No verified game logs for this market and selection.'}
        </p>
        {evidence?.history ? (
          <>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {evidence.history.games.map((game, index) => <li key={`${game.date}-${index}`}>{game.date.slice(0, 10)} · {game.value}</li>)}
            </ul>
            <p className="mt-1">These games may differ in opponent, role, minutes and rest. Check those factors before comparing them with the ticket.</p>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function ReviewedTicketXRay({ ingestion }: { ingestion: DraftSlipIngestion }) {
  const nervous = useNervousSystem();
  const [evidence, setEvidence] = useState<TicketEvidenceResponse>();
  const [pending, setPending] = useState(true);
  const legs = ingestion.confirmedLegs;
  const metadata = ingestion.ticketMetadata;
  const recognized = ingestion.recognizedLegCount ?? legs.length;
  const coverage = metadata && screenshotCoverage(metadata, recognized);
  const mode = coverage?.incomplete ? 'incomplete' : ingestion.analysisMode ?? 'research_only';

  useEffect(() => {
    const abort = new AbortController();
    const eligible: TicketEvidenceRequest['legs'] = legs.flatMap((leg) => {
      const market = SUPPORTED_MARKET_TYPES.find((item: MarketType) => item === leg.marketType);
      if (leg.unsupportedMarket || !market || !['NBA', 'NFL'].includes(leg.league)) return [];
      return [{ id: leg.legId, league: leg.league, market, player: leg.player, matchup: leg.teams }];
    }).slice(0, 30);
    if (!eligible.length) {
      setPending(false);
      return;
    }
    setPending(true);
    setEvidence(undefined);
    void fetch('/api/run/ticket-evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abort.signal,
      body: JSON.stringify({ legs: eligible } satisfies TicketEvidenceRequest)
    }).then(async (response) => {
      if (response.ok && !abort.signal.aborted) setEvidence(await response.json() as TicketEvidenceResponse);
    }).catch(() => {
      // Unavailable evidence remains explicit for each selection.
    }).finally(() => {
      if (!abort.signal.aborted) setPending(false);
    });
    return () => abort.abort();
  }, [legs]);

  const structure = buildSlipStructureReport(legs.map((leg) => ({
    id: leg.legId, player: leg.player, market: leg.unsupportedMarket ? 'unsupported' : leg.marketType,
    game: leg.teams?.trim().toLowerCase()
  })));
  const shared = structure.correlation_edges.find((edge) => edge.kind === 'same_player') ?? structure.correlation_edges[0];
  const hasEvidence = Object.values(evidence?.byLegId ?? {}).some((item) => item.event || item.history || item.injuries);
  const pressure = mode === 'incomplete'
    ? ingestion.coverageNote ?? coverage?.note ?? 'Parts of the ticket still need review.'
    : shared?.reason ?? (mode === 'research_only'
      ? 'Full pricing or contract terms could not be verified.'
      : 'There is insufficient evidence to rank any selection as the weakest.');
  const action = mode === 'incomplete' ? 'Return to review and add or confirm the missing selections.'
    : shared ? 'Inspect the linked selections and check how the same player or game could affect both.'
      : 'Confirm the event and contract terms with the original provider before acting.';

  return (
    <article className="mx-auto max-w-3xl space-y-6 break-words px-1 py-3" data-testid="xray-briefing">
      <section className="space-y-2">
        <p className={label}>Your Ticket</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{modeLabel[mode]}</h1>
        <p className="text-sm text-slate-300">
          {metadata?.declaredLegCount != null ? `${recognized} of ${metadata.declaredLegCount} selections recognized.` : `${recognized} selections recognized.`}
          {' '}{legs.length} confirmed.
        </p>
        {mode === 'incomplete' ? <p className="text-sm font-semibold text-amber-100">Partial Research · confirmed selections only</p> : null}
        {metadata?.officialCombinedAmericanOdds ? <p className="text-sm text-slate-300">Screenshot combined price {metadata.officialCombinedAmericanOdds}.</p> : null}
      </section>

      <section className="space-y-2 border-t border-white/10 pt-4">
        <h2 className={label}>ResearchBets Read</h2>
        <p className="text-sm leading-6 text-slate-200">
          {mode === 'incomplete' ? 'The full ticket construction remains unknown. '
            : mode === 'research_only' ? 'Selected markets can be researched individually. Combined probability, payout estimates and expected value are unavailable. '
              : 'The reviewed ticket is eligible for conventional structural analysis. Original prices are available in each leg. '}
          {pending ? 'Checking independent data sources.' : hasEvidence ? 'Available source evidence is listed by selection.' : 'Data unavailable from independent sources for these selections.'}
        </p>
      </section>
      <section className="space-y-2">
        <h2 className={label}>Primary Pressure</h2>
        <p className="text-sm leading-6 text-amber-100">{pressure}</p>
      </section>
      <section className="space-y-2">
        <h2 className={label}>Suggested Next Action</h2>
        <p className="text-sm leading-6 text-slate-200">{action}</p>
        {mode === 'incomplete' ? <Link className={linkStyle} href={nervous.toHref('/ingest', { resume: '1' })}>Return to ticket review</Link> : null}
      </section>
      <section className="space-y-2 border-t border-white/10 pt-4">
        <h2 className={label}>Inspect Each Leg</h2>
        {legs.map((leg) => {
          const edges = structure.correlation_edges.filter((edge) => edge.a_leg_id === leg.legId || edge.b_leg_id === leg.legId);
          return (
            <details key={leg.legId} className="rounded-lg border border-white/10 bg-slate-950/50 px-3">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-slate-100">{description(leg)}</summary>
              <div className="space-y-2 pb-3 text-sm leading-6 text-slate-300">
                <p>Confirmed {leg.sourceScreenshotIndex ? `from screenshot ${leg.sourceScreenshotIndex}` : 'during ticket review'} · {leg.league}</p>
                {leg.odds ? <p>Original observed price {leg.odds}</p> : null}
                {leg.teams ? <p>Entered matchup {leg.teams}</p> : null}
                {edges.length ? <p>{edges.length} shared dependency {edges.length === 1 ? 'link' : 'links'} among reviewed selections.</p> : null}
                <EvidenceDetails leg={leg} evidence={evidence?.byLegId[leg.legId]} pending={pending} />
              </div>
            </details>
          );
        })}
      </section>
    </article>
  );
}
