'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const LoadingPanel = ({ height }: { height: string }) => (
  <div
    className={`animate-pulse border-y border-white/[0.06] bg-white/[0.015] ${height}`}
    aria-hidden="true"
  />
);

const ConstructionIntelligencePanel = dynamic(
  () => import('@/src/components/xray/ConstructionIntelligencePanel').then((module) => module.ConstructionIntelligencePanel),
  { ssr: false, loading: () => <LoadingPanel height="h-40" /> },
);

const TicketPulseLaunch = dynamic(
  () => import('@/src/components/track/TicketPulseLaunch').then((module) => module.TicketPulseLaunch),
  { ssr: false, loading: () => <LoadingPanel height="h-24" /> },
);

const ResearchPageContent = dynamic(
  () => import('@/src/components/research/ResearchPageContent'),
  { ssr: false, loading: () => <LoadingPanel height="h-64" /> },
);

export function StressTestSecondaryPanels() {
  const [showStructure, setShowStructure] = useState(false);
  const [showDeepResearch, setShowDeepResearch] = useState(false);

  return (
    <section className="space-y-5">
      <TicketPulseLaunch />

      <div className="border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setShowStructure((value) => !value)}
          className="flex w-full items-center justify-between gap-4 py-2 text-left"
          aria-expanded={showStructure}
        >
          <span>
            <span className="block text-sm font-medium text-slate-200">Construction details</span>
            <span className="mt-1 block text-xs text-slate-500">
              Open the dependency map, push-budget logic, and structural evidence behind the headline read.
            </span>
          </span>
          <span className="text-lg text-slate-500">{showStructure ? '−' : '+'}</span>
        </button>
        {showStructure ? (
          <div className="mt-4">
            <ConstructionIntelligencePanel />
          </div>
        ) : null}
      </div>

      <div id="deep-analysis" className="scroll-mt-4 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setShowDeepResearch((value) => !value)}
          className="flex w-full items-center justify-between gap-4 py-2 text-left"
          aria-expanded={showDeepResearch}
        >
          <span>
            <span className="block text-sm font-medium text-slate-200">Deep research workbench</span>
            <span className="mt-1 block text-xs text-slate-500">
              Open the full research machinery only when you need the underlying evidence and model detail.
            </span>
          </span>
          <span className="text-lg text-slate-500">{showDeepResearch ? '−' : '+'}</span>
        </button>
        {showDeepResearch ? (
          <div className="mt-4">
            <ResearchPageContent />
          </div>
        ) : null}
      </div>
    </section>
  );
}
