'use client';

import React from 'react';
import Link from 'next/link';

import type { ScoutCard } from '@/src/core/scout/types';

type ScoutCardsPanelProps = {
  cards: ScoutCard[];
  buildHref: (path: ScoutCard['ctaPath'], query?: Record<string, string | number | undefined>) => string;
};

export function ScoutCardsPanel({ cards, buildHref }: ScoutCardsPanelProps) {
  if (!cards.length) return null;

  return (
    <section className="space-y-2" data-testid="scout-cards-panel">
      <div className="grid gap-2 md:grid-cols-3">
        {cards.map((card) => (
          <article key={card.id} className="rounded-lg border border-white/10 bg-slate-950/70 p-2">
            <p className="text-xs font-semibold text-cyan-100">{card.title}</p>
            <div className="mt-1 space-y-0.5 text-[11px] text-slate-300">
              {card.hooks.slice(0, 2).map((hook) => <p key={hook}>{hook}</p>)}
            </div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-400">
              {card.evidence.slice(0, 2).map((item) => <li key={item}>{item}</li>)}
            </ul>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {Array.from(new Set(card.riskTags)).map((tag) => <span key={`${card.id}-${tag}`} className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">{tag}</span>)}
            </div>
            <Link href={buildHref(card.ctaPath, card.ctaQuery)} className="mt-1.5 inline-block rounded border border-cyan-300/40 px-2 py-1 text-[11px] text-cyan-100">{card.ctaLabel} →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
