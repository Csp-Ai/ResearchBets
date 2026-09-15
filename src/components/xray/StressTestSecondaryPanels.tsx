'use client';

import dynamic from 'next/dynamic';

const LoadingPanel = ({ height }: { height: string }) => (
  <div
    className={`animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.02] ${height}`}
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
  return (
    <>
      <ConstructionIntelligencePanel />
      <TicketPulseLaunch />
      <div id="deep-analysis" className="scroll-mt-4">
        <ResearchPageContent />
      </div>
    </>
  );
}
