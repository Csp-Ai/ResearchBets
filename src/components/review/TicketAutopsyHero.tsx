'use client';

import { useMemo, useState } from 'react';

import { saveGuardrail } from '@/src/core/guardrails/localGuardrails';
import { extractLearningArtifactFromPostmortem } from '@/src/core/postmortem/learning';
import { getBettorMistakePatternSummary } from '@/src/core/postmortem/patternSource';
import type { PostmortemLegRecord, PostmortemRecord } from '@/src/core/review/types';

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const marketLabel = (value: string) => titleCase(value);

const missDistance = (leg: PostmortemLegRecord) => Math.abs(Math.min(0, leg.delta));

const breakerScore = (leg: PostmortemLegRecord) =>
  (leg.hit ? -100 : 100) + missDistance(leg) * 3 + leg.missTags.length * 6;

const outcomeTone = (status: PostmortemRecord['status']) => {
  if (status === 'won') return 'border-emerald-300/[0.16] bg-emerald-300/[0.045] text-emerald-100';
  if (status === 'lost') return 'border-rose-300/[0.16] bg-rose-300/[0.045] text-rose-100';
  return 'border-slate-300/[0.12] bg-white/[0.025] text-slate-200';
};

const continuityCopy = (record: PostmortemRecord, breaker?: PostmortemLegRecord) => {
  const pregame = record.lifecycle_lineage?.pregame?.canonical_leg_id;
  const live = record.lifecycle_lineage?.live?.canonical_leg_id;
  const settled = record.lifecycle_lineage?.settled?.canonical_leg_id ?? record.weakest_leg_identity?.canonical_leg_id ?? breaker?.legId;

  if (pregame && settled && pregame === settled) {
    return {
      label: 'X-Ray carried through',
      tone: 'text-cyan-100 border-cyan-300/[0.16] bg-cyan-300/[0.045]',
      detail: 'The pregame weakest-leg candidate became the settled breaking leg.',
    };
  }
  if (live && settled && live === settled) {
    return {
      label: 'Pulse caught the break',
      tone: 'text-violet-100 border-violet-300/[0.16] bg-violet-300/[0.045]',
      detail: 'The live pressure point became the settled breaking leg.',
    };
  }
  if ((pregame || live) && settled) {
    return {
      label: 'Pressure point changed',
      tone: 'text-amber-100 border-amber-300/[0.16] bg-amber-300/[0.045]',
      detail: 'The ticket broke somewhere different than the earlier weakest-leg read.',
    };
  }
  return {
    label: 'Observed at settlement',
    tone: 'text-slate-300 border-white/[0.08] bg-white/[0.025]',
    detail: 'There is not enough preserved lifecycle identity to compare before, during, and after.',
  };
};

export function TicketAutopsyHero({ record }: { record: PostmortemRecord }) {
  const [guardrailSaved, setGuardrailSaved] = useState(false);

  const breaker = useMemo(
    () => [...record.legs].sort((a, b) => breakerScore(b) - breakerScore(a))[0],
    [record.legs],
  );
  const artifact = useMemo(() => extractLearningArtifactFromPostmortem(record), [record]);
  const patternSummary = useMemo(() => getBettorMistakePatternSummary(), [record.ticketId]);
  const continuity = useMemo(() => continuityCopy(record, breaker), [record, breaker]);

  const hits = record.legs.filter((leg) => leg.hit).length;
  const misses = record.legs.length - hits;
  const hitShare = record.legs.length ? Math.round((hits / record.legs.length) * 100) : 0;
  const topMiss = breaker && !breaker.hit ? breaker : record.legs.find((leg) => !leg.hit);
  const breakerTags = topMiss?.missTags ?? [];
  const repeatedPattern = artifact.breaking_pattern ?? artifact.failure_pattern;

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(11,16,25,.96),rgba(4,7,12,.99))] shadow-[0_30px_100px_rgba(0,0,0,.32)]">
      <style jsx>{`
        .autopsy-scan { animation: autopsyScan 5s ease-in-out infinite; }
        @keyframes autopsyScan { 0%,100% { transform:translateX(-120%); opacity:0; } 20% { opacity:.4; } 55% { opacity:.8; } 100% { transform:translateX(520%); opacity:0; } }
        @media (prefers-reduced-motion: reduce) { .autopsy-scan { animation:none !important; } }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-rose-300/[0.045] blur-[130px]" />
        <div className="absolute -left-20 bottom-[-8rem] h-72 w-72 rounded-full bg-cyan-300/[0.045] blur-[130px]" />
        <div className="autopsy-scan absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-transparent via-white/[0.025] to-transparent" />
      </div>

      <div className="relative border-b border-white/[0.06] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.19em] text-rose-100/55">Ticket Autopsy · after settlement</div>
            <h1 className="mt-2 text-[31px] font-semibold tracking-[-0.055em] sm:text-[42px]">
              {record.status === 'won'
                ? 'The structure held. Save what worked.'
                : topMiss
                  ? `${topMiss.player} became the break point.`
                  : 'The ticket is ready for review.'}
            </h1>
            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500">
              Outcome and process are separated here. ResearchBets preserves which reads hit, what actually broke, whether earlier pressure carried through, and what should change next time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${outcomeTone(record.status)}`}>{record.status}</span>
            <span className={`rounded-full border px-3 py-2 text-[10px] font-semibold ${continuity.tone}`}>{continuity.label}</span>
          </div>
        </div>
      </div>

      <div className="relative grid lg:grid-cols-[1.08fr_.92fr]">
        <div className="border-b border-white/[0.06] p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
              <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Reads hit</div>
              <div className="mt-1 text-[23px] font-semibold tracking-[-0.045em]">{hits}/{record.legs.length}</div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
              <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Hit share</div>
              <div className="mt-1 text-[23px] font-semibold tracking-[-0.045em]">{hitShare}%</div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
              <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Misses</div>
              <div className="mt-1 text-[23px] font-semibold tracking-[-0.045em]">{misses}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Ticket anatomy</div>
                <div className="mt-1 text-[15px] font-semibold text-slate-200">Which reads were right vs. which leg broke construction</div>
              </div>
              <div className="text-[9px] text-slate-600">Fragility {record.fragility.score}</div>
            </div>

            <div className="mt-3 grid gap-2">
              {record.legs.map((leg) => {
                const isBreaker = topMiss?.legId === leg.legId;
                const pregame = record.lifecycle_lineage?.pregame?.canonical_leg_id === leg.legId;
                const live = record.lifecycle_lineage?.live?.canonical_leg_id === leg.legId;
                return (
                  <div key={leg.legId} className={`relative overflow-hidden rounded-2xl border px-4 py-3 ${isBreaker ? 'border-rose-300/[0.18] bg-rose-300/[0.045]' : leg.hit ? 'border-emerald-300/[0.10] bg-emerald-300/[0.025]' : 'border-amber-300/[0.10] bg-amber-300/[0.025]'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-[13px] font-semibold text-slate-200">{leg.player}</div>
                          {pregame ? <span className="rounded-full border border-cyan-300/[0.12] px-2 py-0.5 text-[7px] uppercase tracking-[0.12em] text-cyan-100/60">X-Ray</span> : null}
                          {live ? <span className="rounded-full border border-violet-300/[0.12] px-2 py-0.5 text-[7px] uppercase tracking-[0.12em] text-violet-100/60">Pulse</span> : null}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-600">{marketLabel(leg.statType)} · target {leg.target} · final {leg.finalValue}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-[10px] font-semibold uppercase ${isBreaker ? 'text-rose-200' : leg.hit ? 'text-emerald-200' : 'text-amber-200'}`}>{isBreaker ? 'breaker' : leg.hit ? 'hit' : 'miss'}</div>
                        <div className="mt-1 text-[9px] text-slate-600">Δ {leg.delta.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="p-5 sm:p-6">
          <div className={`rounded-2xl border p-4 ${continuity.tone}`}>
            <div className="text-[9px] font-semibold uppercase tracking-[0.15em] opacity-55">Lifecycle continuity</div>
            <div className="mt-1 text-[15px] font-semibold">{continuity.label}</div>
            <p className="mt-1 text-[10px] leading-5 opacity-65">{continuity.detail}</p>
          </div>

          {topMiss ? (
            <div className="mt-4 rounded-2xl border border-rose-300/[0.13] bg-rose-300/[0.035] p-4">
              <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-rose-100/50">Breaker leg</div>
              <div className="mt-2 text-[20px] font-semibold tracking-[-0.035em]">{topMiss.player}</div>
              <div className="mt-1 text-[12px] text-slate-400">{marketLabel(topMiss.statType)} · {topMiss.finalValue}/{topMiss.target}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(breakerTags.length ? breakerTags : ['result_variance']).map((tag) => (
                  <span key={tag} className="rounded-full border border-white/[0.07] bg-black/20 px-2.5 py-1 text-[9px] text-slate-400">{titleCase(tag)}</span>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">{topMiss.missNarrative || topMiss.lessonHint || 'The settled result identifies this as the clearest breaking leg.'}</p>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-violet-300/[0.11] bg-violet-300/[0.03] p-4">
            <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-violet-100/45">Lesson saved to Bettor Memory</div>
            <div className="mt-2 text-[14px] font-semibold text-slate-200">{repeatedPattern ? titleCase(repeatedPattern) : artifact.strongest_winning_pattern ? titleCase(artifact.strongest_winning_pattern) : 'Outcome preserved'}</div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">{artifact.takeaway}</p>
            {patternSummary.sample_size > 0 ? (
              <p className="mt-2 text-[9px] text-violet-100/40">Memory now has {patternSummary.sample_size} reviewed slip{patternSummary.sample_size === 1 ? '' : 's'} · {patternSummary.confidence_level} pattern confidence</p>
            ) : null}
          </div>

          {record.nextTimeRule ? (
            <div className="mt-4 rounded-2xl border border-cyan-300/[0.11] bg-cyan-300/[0.03] p-4">
              <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-cyan-100/45">Next-time guardrail</div>
              <div className="mt-2 text-[14px] font-semibold text-slate-200">{record.nextTimeRule.title}</div>
              <p className="mt-1 text-[10px] leading-5 text-slate-500">{record.nextTimeRule.body}</p>
              <button
                type="button"
                onClick={() => {
                  saveGuardrail(record.nextTimeRule!);
                  setGuardrailSaved(true);
                }}
                className="mt-3 rounded-xl bg-white px-3 py-2.5 text-[10px] font-bold text-[#071015]"
              >
                {guardrailSaved ? 'Guardrail saved ✓' : 'Use this next time'}
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
