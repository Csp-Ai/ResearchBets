'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import { LiveCredibilityStrip } from '@/app/cockpit/components/LiveCredibilityStrip';
import { PreviewStrip } from '@/src/components/landing/PreviewStrip';
import { TicketEmptyCoach } from '@/src/components/landing/TicketEmptyCoach';
import { flyToTicket } from '@/src/components/landing/flyToTicket';
import { RunIntegrityPanel } from '@/app/cockpit/components/RunIntegrityPanel';
import { useCockpitToday } from '@/app/cockpit/hooks/useCockpitToday';
import type { CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { CockpitHeader } from '@/src/components/cockpit/CockpitHeader';
import { CockpitShell } from '@/src/components/cockpit/CockpitShell';
import { Panel, PanelHeader } from '@/src/components/landing/ui';
import { spineHref } from '@/src/core/nervous/spineNavigation';
import type { MarketType } from '@/src/core/markets/marketType';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';
import { formatSignedPct } from '@/src/core/markets/edgePrimitives';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { Button } from '@/src/components/ui/button';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { useRunEvents } from '@/src/core/events/useRunEvents';
import { ensureTraceId } from '@/src/core/trace/trace_id';
import type { ResearchProvenance } from '@/src/core/run/researchRunDTO';
import { deriveSlipRiskSummary } from '@/src/core/slips/slipRiskSummary';
import { buildOpenTickets } from '@/src/core/live/openTickets';
import { listTrackedTickets } from '@/src/core/track/store';
import { listPostmortems } from '@/src/core/review/store';
import type { PostmortemRecord } from '@/src/core/review/types';
import { deriveLiveCommandSurface } from '@/src/core/cockpit/ticketLoop';
import { DraftSlipStore } from '@/src/core/slips/draftSlipStore';

import './cockpit.css';

type Stage = 'Before' | 'Analyze' | 'During' | 'After';

type ScoutSignal = {
  id: string;
  headline: string;
  note: string;
  context: string;
  leg: CockpitBoardLeg;
};

type TicketSummaryTone = 'balanced' | 'correlation' | 'volatility' | 'setup';

type TicketSummaryState = {
  countLabel: string;
  shapeLabel: string;
  recommendation: string;
  nextAction: string;
  tone: TicketSummaryTone;
  weakestPreviewTitle: string;
  weakestPreviewBody: string;
  weakestDetailTitle: string;
  weakestDetailBody: string;
  correlationValue: string;
  correlationBody: string;
  fragilityValue: string;
  fragilityBody: string;
  analysisReady: boolean;
  showInsightBlocks: boolean;
};

const COCKPIT_MARKETS: MarketType[] = [
  'spread',
  'total',
  'moneyline',
  'ra',
  'points',
  'threes',
  'rebounds',
  'assists',
  'pra'
];
const toMarketType = (market: string): MarketType => {
  const normalized = market.toLowerCase();
  return (COCKPIT_MARKETS.includes(normalized as MarketType) ? normalized : 'points') as MarketType;
};

const toPreviewStatusLabel = (mode: 'live' | 'cache' | 'demo') => {
  if (mode === 'demo') return 'Demo mode (live feeds off)';
  if (mode === 'cache') return 'Using cached slate';
  return 'Live mode';
};

const confidenceSummary = (leg: CockpitBoardLeg) => {
  if (typeof leg.confidencePct === 'number') {
    const tone = leg.confidencePct >= 70 ? 'Strong' : leg.confidencePct >= 58 ? 'Solid' : 'Thin';
    return `${tone} confidence · ${Math.round(leg.confidencePct)}%`;
  }
  if (typeof leg.hitRateL10 === 'number') {
    const tone = leg.hitRateL10 >= 7 ? 'Strong' : leg.hitRateL10 >= 6 ? 'Solid' : 'Thin';
    return `${tone} confidence · L10 ${leg.hitRateL10}/10`;
  }
  return 'Watchlist confidence';
};

const edgeSummary = (leg: CockpitBoardLeg) => {
  if (typeof leg.edgeDelta === 'number') {
    return `Edge ${formatSignedPct(leg.edgeDelta)}`;
  }
  return null;
};

const riskTag = (leg: CockpitBoardLeg) => {
  if (leg.deadLegRisk === 'high') return 'Fragility watch';
  if (leg.deadLegRisk === 'med') return 'Needs script';
  if (leg.riskTag === 'watch') return 'Volatility watch';
  return null;
};

const boardNote = (leg: CockpitBoardLeg) => {
  return leg.deadLegReasons?.[0] ?? leg.roleReasons?.[0] ?? leg.rationale?.[0] ?? null;
};

type DecisionTone = 'strong' | 'solid' | 'thin' | 'fragile';

const confidenceTone = (leg: CockpitBoardLeg): DecisionTone => {
  if (leg.deadLegRisk === 'high') return 'fragile';
  if (typeof leg.confidencePct === 'number') {
    if (leg.confidencePct >= 70) return 'strong';
    if (leg.confidencePct >= 58) return 'solid';
    return 'thin';
  }
  if (typeof leg.hitRateL10 === 'number') {
    if (leg.hitRateL10 >= 7) return 'strong';
    if (leg.hitRateL10 >= 6) return 'solid';
    return 'thin';
  }
  return leg.deadLegRisk === 'med' ? 'thin' : 'solid';
};

const toneLabel = (tone: DecisionTone) => {
  if (tone === 'strong') return 'Strong';
  if (tone === 'solid') return 'Solid';
  if (tone === 'thin') return 'Thin';
  return 'Fragile';
};

const strongestFor = (leg: CockpitBoardLeg) => {
  if (typeof leg.edgeDelta === 'number' && leg.edgeDelta >= 0.06) {
    return `Clear price edge (${formatSignedPct(leg.edgeDelta)})`;
  }
  if (typeof leg.confidencePct === 'number' && leg.confidencePct >= 68) {
    return `Model conviction is strong (${Math.round(leg.confidencePct)}%)`;
  }
  if (typeof leg.hitRateL10 === 'number' && leg.hitRateL10 >= 7) {
    return 'Recent form is holding';
  }
  return leg.roleReasons?.[0] ?? leg.rationale?.[0] ?? 'Setup supports the angle';
};

const strongestAgainst = (leg: CockpitBoardLeg) => {
  if (leg.deadLegReasons?.length) return leg.deadLegReasons[0] ?? 'Fragility pressure detected';
  if (leg.deadLegRisk === 'high') return 'Fragile leg under ticket pressure';
  if (leg.deadLegRisk === 'med') return 'Script-dependent outcome';
  if (leg.riskTag === 'watch') return 'High volatility play';
  if (typeof leg.confidencePct === 'number' && leg.confidencePct < 58) {
    return 'Inconsistent signal quality';
  }
  if (typeof leg.hitRateL10 === 'number' && leg.hitRateL10 <= 5) return 'Inconsistent recent results';
  return 'No major fragility pressure';
};

const ticketContext = (leg: CockpitBoardLeg) => {
  if (leg.deadLegRisk === 'high') return 'Weakest-leg candidate';
  if (leg.deadLegRisk === 'med') return 'Correlation-sensitive';
  if (leg.riskTag === 'watch') return 'Ticket volatility lever';
  if (typeof leg.edgeDelta === 'number' && leg.edgeDelta >= 0.06) return 'Anchor candidate';
  return 'Balanced leg';
};

const primarySignal = (leg: CockpitBoardLeg, tone: DecisionTone) => {
  if (tone === 'fragile') return 'Fragility dominates';
  if (leg.deadLegRisk === 'med') return 'Script risk is live';
  if (typeof leg.edgeDelta === 'number' && leg.edgeDelta >= 0.06) return 'Edge-led look';
  if (leg.riskTag === 'watch') return 'Volatility-driven';
  return 'Balanced setup';
};

const isRiskDuplicatedByTag = (leg: CockpitBoardLeg, riskSignal: string) => {
  const normalized = riskSignal.toLowerCase();
  if (leg.riskTag === 'watch' && normalized.includes('volatility')) return true;
  if (leg.deadLegRisk === 'high' && normalized.includes('fragile')) return true;
  if (leg.deadLegRisk === 'med' && normalized.includes('script')) return true;
  return false;
};

const countLabel = (count: number) => `${count} ${count === 1 ? 'leg' : 'legs'}`;
const fragilityBand = (value: number | null) =>
  value == null ? 'Waiting' : value >= 65 ? 'Elevated' : value >= 40 ? 'Watch' : 'Stable';
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function CockpitLandingClient({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const cockpitRef = useRef<HTMLElement | null>(null);
  const pasteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const saveInputRef = useRef<HTMLInputElement | null>(null);
  const ticketBadgeRef = useRef<HTMLSpanElement | null>(null);
  const mobileTicketCtaRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const nervous = useNervousSystem();
  const [selectedSport, setSelectedSport] = useState<'NBA' | 'NFL'>(() => {
    const fromParams =
      typeof searchParams?.sport === 'string' ? searchParams.sport.toUpperCase() : '';
    if (fromParams === 'NFL') return 'NFL';
    return nervous.sport === 'NFL' ? 'NFL' : 'NBA';
  });
  const [selectedMode, setSelectedMode] = useState<'live' | 'demo'>(() => {
    if (searchParams?.mode === 'demo') return 'demo';
    return nervous.mode === 'demo' ? 'demo' : 'live';
  });
  const {
    board,
    today,
    provenance,
    neutralStatus,
    strictLiveUnavailable,
    boardUpdateTick,
    refreshToday
  } = useCockpitToday({ ...nervous, sport: selectedSport, mode: selectedMode });
  const {
    slip,
    slip_id: draftSlipId,
    trace_id: draftTraceId,
    addLeg,
    removeLeg,
    updateLeg
  } = useDraftSlip();

  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [analysis, setAnalysis] = useState({
    running: false,
    weakestId: '',
    weakestLabel: '',
    traceId: nervous.trace_id,
    corrLabel: '',
    fragility: null as number | null,
    reasons: [] as string[],
    stage: 'Before' as Stage,
    runProvenance: undefined as ResearchProvenance | undefined
  });
  const [pulseToken, setPulseToken] = useState(0);
  const [phaseStep, setPhaseStep] = useState<null | 'Ingest' | 'Normalize' | 'Score' | 'Verdict'>(
    null
  );
  const [ui, setUi] = useState({
    navDrawerOpen: false,
    slipSheetOpen: false,
    pasteModalOpen: false,
    saveModalOpen: false,
    accountOpen: false,
    tzOpen: false,
    tz: 'ET'
  });
  const [ticketHeaderPulse, setTicketHeaderPulse] = useState(false);
  const [recentlyChangedLegIds, setRecentlyChangedLegIds] = useState<Set<string>>(new Set());
  const [recentlyChangedGroups, setRecentlyChangedGroups] = useState<Set<string>>(new Set());
  const [trackedTicketTick, setTrackedTicketTick] = useState(0);
  const boardByIdRef = useRef(new Map<string, string>());

  const onSetMode = (mode: 'live' | 'demo') => {
    setSelectedMode(mode);
    setPulseToken((v) => v + 1);
    const href = nervous.toHref(pathname || '/cockpit', { mode });
    router.replace(href);
  };

  const onSetSport = (sport: 'NBA' | 'NFL') => {
    setSelectedSport(sport);
    setPulseToken((v) => v + 1);
    const href = nervous.toHref(pathname || '/cockpit', { sport });
    router.replace(href);
  };

  const onOpenLeg = (leg: (typeof board)[number]) => {
    const href = nervous.toHref(`/game/${encodeURIComponent(leg.gameId)}`, {
      tab: 'live',
      highlight: leg.id
    });
    router.push(href);
  };

  const groupedGames = useMemo(() => {
    const filtered = board.filter((leg) => {
      const hay = `${leg.matchup} ${leg.player} ${leg.market}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });

    return filtered.reduce<Record<string, typeof board>>((acc, leg) => {
      const key = `${leg.matchup} • ${leg.startTime}`;
      if (!acc[key]) acc[key] = [];
      acc[key]?.push(leg);
      return acc;
    }, {});
  }, [board, query]);

  const previewStatusLabel = useMemo(() => {
    const payloadMode = today.mode ?? provenance.mode;
    return toPreviewStatusLabel(payloadMode);
  }, [today.mode, provenance.mode]);

  const scoutSignals = useMemo<ScoutSignal[]>(() => {
    return board
      .slice()
      .sort((a, b) => {
        const aHit = typeof a.hitRateL10 === 'number' ? a.hitRateL10 : 0;
        const bHit = typeof b.hitRateL10 === 'number' ? b.hitRateL10 : 0;
        if (bHit !== aHit) return bHit - aHit;
        if (a.riskTag === b.riskTag) return 0;
        return a.riskTag === 'stable' ? -1 : 1;
      })
      .slice(0, 4)
      .map((leg) => ({
        id: leg.id,
        headline: `${leg.player} · ${leg.market} ${leg.line}`,
        note: edgeSummary(leg) ?? confidenceSummary(leg),
        context: `${leg.matchup} · ${leg.startTime} · ${leg.odds}`,
        leg
      }));
  }, [board]);

  useEffect(() => {
    const nextMap = new Map<string, string>();
    const changed = new Set<string>();
    const changedGroups = new Set<string>();

    board.forEach((leg) => {
      const fingerprint = [
        leg.player,
        leg.market,
        leg.line,
        leg.odds,
        leg.startTime,
        leg.matchup
      ].join('|');
      nextMap.set(leg.id, fingerprint);
      const previous = boardByIdRef.current.get(leg.id);
      if ((previous && previous !== fingerprint) || (!previous && boardByIdRef.current.size > 0)) {
        changed.add(leg.id);
        changedGroups.add(`${leg.matchup} • ${leg.startTime}`);
      }
    });

    boardByIdRef.current = nextMap;
    if (changed.size === 0) return;

    setRecentlyChangedLegIds(changed);
    setRecentlyChangedGroups(changedGroups);

    const timer = window.setTimeout(() => {
      setRecentlyChangedLegIds(new Set());
      setRecentlyChangedGroups(new Set());
    }, 2_000);

    return () => window.clearTimeout(timer);
  }, [board, boardUpdateTick]);

  const slipIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);
  const legCount = slip.length;
  const stressEnabled = legCount >= 2;
  const diagnosticsReady = analysis.stage !== 'Before' || analysis.running;

  const closeOverlays = useCallback(() => {
    setUi((prev) => ({
      ...prev,
      navDrawerOpen: false,
      slipSheetOpen: false,
      pasteModalOpen: false,
      saveModalOpen: false,
      accountOpen: false,
      tzOpen: false
    }));
  }, []);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOverlays();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [closeOverlays]);

  useEffect(() => {
    if (ui.pasteModalOpen) pasteInputRef.current?.focus();
  }, [ui.pasteModalOpen]);

  useEffect(() => {
    if (ui.saveModalOpen) saveInputRef.current?.focus();
  }, [ui.saveModalOpen]);

  useEffect(() => {
    if (!ticketHeaderPulse) return;
    const timer = window.setTimeout(() => setTicketHeaderPulse(false), 550);
    return () => window.clearTimeout(timer);
  }, [ticketHeaderPulse]);

  useEffect(() => {
    const sync = () => setTrackedTicketTick((value) => value + 1);
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const onAdd = (leg: (typeof board)[number], triggerEl?: HTMLElement | null) => {
    if (slipIds.has(leg.id) || slip.length >= 6) return;
    addLeg({
      id: leg.id,
      player: leg.player,
      marketType: toMarketType(leg.market),
      line: leg.line,
      odds: leg.odds,
      game: leg.matchup
    });
    setTicketHeaderPulse(true);
    setPulseToken((v) => v + 1);
    const target = ticketBadgeRef.current ?? mobileTicketCtaRef.current;
    flyToTicket({ from: triggerEl ?? null, to: target ?? null });
  };

  const onRemove = (id: string) => {
    removeLeg(id);
    setPulseToken((v) => v + 1);
  };

  const onAnalyzeLeg = async (leg: (typeof board)[number], triggerEl?: HTMLElement | null) => {
    const alreadyAdded = slipIds.has(leg.id);
    if (!alreadyAdded) {
      onAdd(leg, triggerEl);
    }

    const nextCount = alreadyAdded ? slip.length : slip.length + 1;
    const ticketPanel = document.getElementById('ticket-panel');
    if (ticketPanel && typeof ticketPanel.scrollIntoView === 'function') {
      ticketPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (nextCount >= 2) {
      await runStressTest();
    }
  };

  const onEditLeg = (id: string, field: 'line' | 'odds', value: string) => {
    const existing = slip.find((leg) => leg.id === id);
    if (!existing) return;
    updateLeg({ ...existing, [field]: value });
  };

  const compactLine = useMemo(() => {
    const structure = buildSlipStructureReport(
      slip.map((leg) => ({
        id: leg.id,
        player: leg.player,
        market: leg.marketType,
        line: leg.line,
        odds: leg.odds,
        game: leg.game
      }))
    );
    if (structure.legs.length === 0) return { hitEstimate: '—', breakEven: '—', gap: '—' };
    const avgFragility =
      structure.legs.reduce((sum, leg) => sum + (leg.fragility_score ?? 50), 0) /
      structure.legs.length;
    const hitEstimateValue = Math.max(5, Math.min(95, Math.round(100 - avgFragility)));
    const breakEvenValue = 52;
    const gapValue = hitEstimateValue - breakEvenValue;
    return {
      hitEstimate: `${hitEstimateValue}%`,
      breakEven: `${breakEvenValue}%`,
      gap: `${gapValue > 0 ? '+' : ''}${gapValue}%`
    };
  }, [slip]);

  const riskSummary = useMemo(
    () =>
      deriveSlipRiskSummary(
        slip.map((leg) => ({
          id: leg.id,
          player: leg.player,
          market: leg.marketType,
          marketType: leg.marketType,
          line: leg.line,
          odds: leg.odds,
          game: leg.game
        }))
      ),
    [slip]
  );

  const trackedContext = useMemo(() => {
    if (typeof window === 'undefined')
      return { ticket: null, postmortem: null as PostmortemRecord | null };

    const storageTick = trackedTicketTick;
    const trackedTickets = listTrackedTickets();
    const postmortems = listPostmortems();
    const continuityTraceId = analysis.traceId || draftTraceId || nervous.trace_id;
    const matchingTicket =
      trackedTickets.find(
        (ticket) =>
          (draftSlipId && ticket.slip_id === draftSlipId) ||
          (continuityTraceId && ticket.trace_id === continuityTraceId)
      ) ??
      (storageTick >= 0 ? trackedTickets[0] : null) ??
      null;

    const matchingPostmortem =
      postmortems.find(
        (record) =>
          (matchingTicket?.ticketId && record.ticketId === matchingTicket.ticketId) ||
          (draftSlipId && record.slip_id === draftSlipId) ||
          (continuityTraceId && record.trace_id === continuityTraceId)
      ) ?? null;

    return { ticket: matchingTicket, postmortem: matchingPostmortem };
  }, [analysis.traceId, draftSlipId, draftTraceId, nervous.trace_id, trackedTicketTick]);

  const liveTicket = useMemo(() => {
    if (!trackedContext.ticket) return null;
    return (
      buildOpenTickets(
        (trackedContext.ticket.mode ?? selectedMode) as 'live' | 'cache' | 'demo',
        [trackedContext.ticket],
        [],
        new Date().toISOString(),
        {}
      )[0] ?? null
    );
  }, [selectedMode, trackedContext.ticket]);

  const liveCommand = useMemo(
    () => deriveLiveCommandSurface(liveTicket, trackedContext.postmortem),
    [liveTicket, trackedContext.postmortem]
  );

  const ticketModeState: 'setup' | 'analysis' | 'live' | 'after' =
    liveCommand?.stage === 'after'
      ? 'after'
      : liveCommand?.stage === 'live'
        ? 'live'
        : legCount === 0
          ? 'setup'
          : 'analysis';

  const ticketSummary = useMemo<TicketSummaryState>(() => {
    if (legCount === 0) {
      return {
        countLabel: '0 legs',
        shapeLabel: 'Build a 2–4 leg ticket',
        recommendation:
          'Add legs from Tonight’s Board to expose weakest-leg and correlation pressure before lock.',
        nextAction:
          'Start with two angles, then let analysis show the break point before you add more.',
        tone: 'setup',
        weakestPreviewTitle: 'Weakest leg will appear after analysis',
        weakestPreviewBody:
          'Add legs and run analysis to surface the main failure point before lock.',
        weakestDetailTitle: 'Weakest leg insight',
        weakestDetailBody:
          'No insight yet. The ticket needs 2–4 legs before weakest-leg pressure becomes useful.',
        correlationValue: 'Waiting on shape',
        correlationBody:
          'Correlation pressure will read once the ticket has enough legs to compare environments.',
        fragilityValue: 'Waiting on shape',
        fragilityBody: 'Fragility index unlocks after you build a compact ticket and run analysis.',
        analysisReady: false,
        showInsightBlocks: false
      };
    }

    const sameGameEdges =
      riskSummary.correlationReason.toLowerCase().includes('stack') || riskSummary.correlationFlag;
    const highVol = riskSummary.highVolatilityLegs >= 2;
    const shapeLabel = sameGameEdges
      ? 'Correlation-heavy build'
      : highVol
        ? 'High-volatility shape'
        : legCount >= 3
          ? 'Balanced ticket'
          : 'Balanced start';

    const recommendation =
      legCount < 2
        ? 'Add one more leg to unlock weakest-leg and pressure analysis.'
        : sameGameEdges
          ? 'Run analysis before adding another leg tied to the same script.'
          : highVol
            ? 'Run analysis before locking more volatility into this ticket.'
            : 'Run analysis now to confirm the weakest leg before lock.';

    const nextAction =
      legCount < 2
        ? 'One more leg turns this into an analysis-ready ticket.'
        : analysis.stage === 'Before'
          ? 'This ticket is ready. Run analysis to surface the main failure point.'
          : analysis.running
            ? 'Analysis is running. Stay on the ticket — pressure readouts are updating.'
            : (analysis.reasons[0] ?? 'Review the readout, then decide whether to trim or lock.');

    const weakestDetailTitle =
      analysis.stage !== 'Before' && analysis.weakestLabel
        ? `Weakest leg: ${analysis.weakestLabel}`
        : 'Weakest leg will appear after analysis';
    const weakestDetailBody =
      analysis.stage !== 'Before' && analysis.weakestLabel
        ? (analysis.reasons[0] ??
          `${analysis.weakestLabel} carries the most pressure in the current ticket shape.`)
        : 'Add legs and run analysis to surface the main failure point before lock.';

    const correlationValue =
      legCount < 2
        ? 'Developing'
        : analysis.stage !== 'Before' && analysis.corrLabel
          ? analysis.corrLabel
          : riskSummary.correlationFlag
            ? 'Elevated'
            : 'Managed';

    const correlationBody =
      legCount < 2
        ? 'A second leg unlocks correlation pressure so you can see whether the story is compact or crowded.'
        : riskSummary.correlationFlag
          ? riskSummary.correlationReason
          : 'No major correlation clusters detected in the current build.';

    const fragilityValue =
      legCount < 2
        ? 'Building'
        : analysis.stage !== 'Before'
          ? `${fragilityBand(analysis.fragility)}${analysis.fragility != null ? ` · ${analysis.fragility}` : ''}`
          : `${capitalize(riskSummary.riskLabel.toLowerCase())} setup · ${riskSummary.fragilityScore}`;

    const fragilityBody =
      legCount < 2
        ? 'Fragility sharpens after one more leg and a full analysis run.'
        : riskSummary.highVolatilityLegs >= 2
          ? `${riskSummary.highVolatilityLegs} legs carry high volatility and can fail together.`
          : riskSummary.dominantRiskFactor;

    return {
      countLabel: countLabel(legCount),
      shapeLabel,
      recommendation,
      nextAction,
      tone: sameGameEdges ? 'correlation' : highVol ? 'volatility' : 'balanced',
      weakestPreviewTitle: 'Weakest leg will appear after analysis',
      weakestPreviewBody: 'Run analysis to reveal the leg most likely to crack this shape.',
      weakestDetailTitle,
      weakestDetailBody,
      correlationValue,
      correlationBody,
      fragilityValue,
      fragilityBody,
      analysisReady: legCount >= 2,
      showInsightBlocks: legCount >= 1
    };
  }, [
    analysis.corrLabel,
    analysis.fragility,
    analysis.reasons,
    analysis.running,
    analysis.stage,
    analysis.weakestLabel,
    legCount,
    riskSummary
  ]);

  const { statusText } = useRunEvents(analysis.traceId ?? nervous.trace_id);

  const runStressTest = async () => {
    if (!stressEnabled || analysis.running) return;
    setPulseToken((v) => v + 1);
    const draftIdentity = DraftSlipStore.ensureIdentity();
    const ensured = ensureTraceId({
      sport: nervous.sport,
      tz: nervous.tz,
      date: nervous.date,
      mode: nervous.mode,
      trace_id: draftIdentity.trace_id ?? analysis.traceId ?? nervous.trace_id,
      slip_id: draftIdentity.slip_id,
      tab: undefined
    });
    const traceId = ensured.trace_id;
    setAnalysis((prev) => ({ ...prev, running: true, stage: 'Analyze', traceId }));
    const shouldShowPhase = selectedMode !== 'live';
    if (shouldShowPhase) {
      setPhaseStep('Ingest');
      window.setTimeout(() => setPhaseStep('Normalize'), 110);
      window.setTimeout(() => setPhaseStep('Score'), 220);
      window.setTimeout(() => setPhaseStep('Verdict'), 330);
      window.setTimeout(() => setPhaseStep(null), 520);
    }
    router.replace(spineHref('/cockpit', nervous, { trace_id: traceId }));

    try {
      const response = await fetch('/api/run/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trace_id: traceId,
          spine: ensured.spine,
          legs: slip.map((leg) => ({
            player: leg.player,
            market: String(leg.marketType),
            line: String(leg.line),
            odds: String(leg.odds ?? '-110'),
            game_id: String(leg.game ?? leg.id)
          }))
        })
      });
      const payload = await response.json();
      const report = buildSlipStructureReport(
        slip.map((leg) => ({
          id: leg.id,
          player: leg.player,
          market: leg.marketType,
          line: leg.line,
          odds: leg.odds,
          game: leg.game
        }))
      );

      const weakestLeg =
        report.legs.find((leg) => leg.player === payload?.analysis?.weakest_leg?.player) ??
        report.legs.find((leg) => leg.leg_id === report.weakest_leg_id);
      const corrLabel = report.script_clusters.some((cluster) => cluster.severity === 'high')
        ? 'High'
        : report.script_clusters.some((cluster) => cluster.severity === 'med')
          ? 'Medium'
          : 'Low';
      const runDto = payload?.run;
      const runTraceId = typeof payload?.trace_id === 'string' ? payload.trace_id : traceId;
      const weakestFromRun =
        typeof runDto?.verdict?.weakest_leg_id === 'string'
          ? report.legs.find((leg) => leg.leg_id === runDto.verdict.weakest_leg_id)
          : undefined;

      setAnalysis({
        running: false,
        weakestId: weakestFromRun?.leg_id ?? weakestLeg?.leg_id ?? '',
        weakestLabel: weakestFromRun?.player ?? weakestLeg?.player ?? '',
        traceId: runTraceId,
        corrLabel,
        fragility:
          typeof runDto?.verdict?.fragility_score === 'number'
            ? runDto.verdict.fragility_score
            : typeof payload?.analysis?.fragility_score === 'number'
              ? payload.analysis.fragility_score
              : typeof weakestLeg?.fragility_score === 'number'
                ? weakestLeg.fragility_score
                : null,
        reasons: Array.isArray(runDto?.verdict?.reasons)
          ? runDto.verdict.reasons
          : Array.isArray(payload?.analysis?.reasons)
            ? payload.analysis.reasons
            : report.reasons.slice(0, 2),
        stage: 'Analyze',
        runProvenance: runDto?.provenance
      });
    } catch {
      setAnalysis((prev) => ({
        ...prev,
        running: false,
        stage: 'Before',
        runProvenance: undefined
      }));
    }
  };

  const saveAnalysis = async () => {
    if (!analysis.traceId || !email.trim()) return;
    setSaveState('saving');
    await fetch('/api/analysis/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trace_id: analysis.traceId, contact: email.trim() })
    }).catch(() => null);
    setSaveState('saved');
    setTimeout(() => {
      setSaveState('idle');
      setUi((p) => ({ ...p, saveModalOpen: false }));
    }, 600);
  };

  return (
    <CockpitShell>
      <div className={`cockpit-page ${analysis.running ? 'running' : ''}`}>
        <CockpitHeader
          title="Board Runtime"
          purpose="Truthful runtime context before you build the ticket."
          ctas={null}
          strip={{
            mode: today.effective?.mode ?? today.mode,
            reason: today.effective?.reason ?? provenance.reason ?? today.reason,
            intentMode: today.intent?.mode ?? nervous.mode,
            updatedAt: provenance.generatedAt ?? today.generatedAt,
            providerSummary: {
              okCount: today.providerHealth?.filter((provider) => provider.ok).length ?? 0,
              total: today.providerHealth?.length ?? 0,
              degraded:
                Boolean(today.reason) ||
                Boolean(today.providerHealth?.some((provider) => !provider.ok))
            },
            traceId: analysis.traceId || nervous.trace_id
          }}
        />

        <section className="cockpit-hero" aria-label="Tonight's board overview">
          <div className="cockpit-hero-copy">
            <p className="cockpit-hero-meta">
              {selectedSport} · {nervous.date} · {ui.tz}
            </p>
            <h1>Tonight&apos;s Board</h1>
            <p className="cockpit-hero-subcopy">
              Start with the board. Add 2–4 legs. Run analysis only when the draft ticket feels
              worth a decision.
            </p>
            <div className="cockpit-hero-actions">
              <button
                className="ui-button ui-button-primary focus-glow"
                onClick={() =>
                  cockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                Build from board
              </button>
              <button
                className="ui-button ui-button-secondary focus-glow"
                onClick={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}
              >
                Paste slip
              </button>
              <Button
                intent="secondary"
                onClick={runStressTest}
                disabled={!stressEnabled || analysis.running}
              >
                Run analysis
              </Button>
            </div>
            <div className="cockpit-hero-flow" aria-label="Tonight workflow">
              <span>1. Scan board</span>
              <span>2. Add 2–4 legs</span>
              <span>3. Review draft ticket</span>
              <span>4. Run analysis</span>
              <span>5. Make decision</span>
            </div>
            {previewStatusLabel === 'Demo mode (live feeds off)' ? (
              <p className="cockpit-mode-note">Demo mode (live feeds off)</p>
            ) : null}
          </div>
          <div className="cockpit-hero-controls">
            <div className="segmented" role="tablist" aria-label="Mode">
              <button
                className={`segment ${selectedMode === 'live' ? 'active' : ''}`}
                onClick={() => onSetMode('live')}
                aria-pressed={selectedMode === 'live'}
              >
                Live
              </button>
              <button
                className={`segment ${selectedMode === 'demo' ? 'active' : ''}`}
                onClick={() => onSetMode('demo')}
                aria-pressed={selectedMode === 'demo'}
              >
                Demo
              </button>
            </div>
            <div className="segmented" role="tablist" aria-label="Sport">
              {(['NBA', 'NFL'] as const).map((sport) => (
                <button
                  key={sport}
                  className={`segment ${selectedSport === sport ? 'active' : ''}`}
                  onClick={() => onSetSport(sport)}
                  aria-pressed={selectedSport === sport}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          id="cockpit"
          ref={cockpitRef}
          aria-label="Bettor cockpit: board and draft ticket"
          className="cockpit-workspace"
        >
          <Panel id="board-panel" className="cockpit-board-panel">
            <PanelHeader
              title="Board markets"
              subtitle={neutralStatus}
              action={<span className="board-count-meta">{board.length} looks</span>}
            />
            <div className="board-toolbar">
              <input
                type="search"
                className="search-input"
                placeholder="Search players or props"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search player props"
              />
            </div>
            <div className="board-list" role="list">
              {Object.entries(groupedGames).map(([group, legs]) => (
                <div className="board-group" key={group}>
                  <div className="group-label">
                    <span>{group}</span>
                    {recentlyChangedGroups.has(group) ? (
                      <span className="group-updated">Updated</span>
                    ) : null}
                  </div>
                  {legs.map((leg) => {
                    const added = slipIds.has(leg.id);
                    const note = boardNote(leg) ?? confidenceSummary(leg);
                    const metaLine = [leg.odds, edgeSummary(leg), confidenceSummary(leg)]
                      .filter(Boolean)
                      .join(' · ');
                    const tag = riskTag(leg);
                    const tone = confidenceTone(leg);
                    const forSignal = strongestFor(leg);
                    const againstSignal = strongestAgainst(leg);
                    const contextSignal = ticketContext(leg);
                    const dominantSignal = primarySignal(leg, tone);
                    const showTag = Boolean(tag) && !isRiskDuplicatedByTag(leg, againstSignal);

                    return (
                      <div
                        key={leg.id}
                        className={`board-row tone-${tone} ${recentlyChangedLegIds.has(leg.id) ? 'row-updated' : ''} ${added ? 'is-added' : ''}`}
                        role="listitem"
                      >
                        <button className="board-row-content" onClick={() => onOpenLeg(leg)}>
                          <div className="board-row-mainline">
                            <div>
                              <p className="board-main">
                                {leg.player} · {leg.market} {leg.line}
                              </p>
                              <p className="board-sub">
                                {leg.matchup} · {leg.startTime}
                              </p>
                            </div>
                            <span className="board-odds">{leg.odds}</span>
                          </div>
                          <p className="board-confidence-line">{metaLine}</p>
                          <div className="board-decision-strip" aria-label="Decision intelligence">
                            <span className="decision-strength">{toneLabel(tone)}</span>
                            <span className="decision-divider">·</span>
                            <span className="decision-watch">{dominantSignal}</span>
                            <span className={`decision-context ${leg.deadLegRisk ? 'context-alert' : ''}`}>{contextSignal}</span>
                          </div>
                          <p className="board-for-line">
                            <strong>For:</strong> {forSignal}
                          </p>
                          <p className="board-against-line">
                            <strong>Risk:</strong> {againstSignal}
                          </p>
                          <div className="board-supporting-line">
                            <p className="board-note">{note}</p>
                            {showTag ? <span className="board-tag">{tag}</span> : null}
                          </div>
                        </button>
                        <div className="board-actions">
                          <button className="board-text-action" onClick={() => onOpenLeg(leg)}>
                            Open
                          </button>
                          <button
                            className="board-text-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              void onAnalyzeLeg(leg, event.currentTarget);
                            }}
                          >
                            Analyze
                          </button>
                          <button
                            className={`add-btn ${added ? 'added' : ''}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onAdd(leg, event.currentTarget);
                            }}
                            disabled={added}
                            aria-pressed={added}
                          >
                            {added ? 'Added' : 'Add'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            className={`desktop-ticket-panel cockpit-ticket-panel ${ticketHeaderPulse ? 'ticket-header-pulse' : ''}`}
            id="ticket-panel"
          >
            <PanelHeader
              title={
                ticketModeState === 'live'
                  ? 'Active Ticket'
                  : ticketModeState === 'after'
                    ? 'Ticket Review'
                    : 'Draft Ticket'
              }
              subtitle={
                ticketModeState === 'live'
                  ? 'Same ticket, now in live management mode.'
                  : ticketModeState === 'after'
                    ? 'Outcome preserved for review and postmortem.'
                    : legCount === 0
                      ? 'Decision room opens at 2–4 legs'
                      : analysis.traceId
                        ? statusText
                        : 'Shape the ticket, then run analysis'
              }
              action={
                <span ref={ticketBadgeRef} className="leg-count-badge" aria-live="polite">
                  {ticketSummary.countLabel}
                </span>
              }
            />

            <div className={`ticket-body ticket-tone-${ticketSummary.tone}`}>
              <section className="ticket-summary-card" aria-label="Draft ticket summary">
                <div className="ticket-summary-topline">
                  <span className="ticket-summary-kicker">
                    {ticketModeState === 'live'
                      ? 'Live command surface'
                      : ticketModeState === 'after'
                        ? 'Outcome handoff'
                        : 'Decision room'}
                  </span>
                  <span
                    className={`ticket-status-pill ${ticketModeState === 'live' || ticketModeState === 'after' || ticketSummary.analysisReady ? 'ready' : 'setup'}`}
                  >
                    {ticketModeState === 'live'
                      ? 'Live tracked'
                      : ticketModeState === 'after'
                        ? 'Review ready'
                        : ticketSummary.analysisReady
                          ? 'Analysis-ready'
                          : 'Setup state'}
                  </span>
                </div>
                <div className="ticket-summary-headline-row">
                  <div>
                    <p className="ticket-summary-count">{ticketSummary.countLabel}</p>
                    <h3 className="ticket-summary-headline">
                      {ticketModeState === 'live'
                        ? (liveCommand?.headline ?? 'Live ticket command surface')
                        : ticketModeState === 'after'
                          ? (liveCommand?.headline ?? 'Outcome review ready')
                          : ticketSummary.shapeLabel}
                    </h3>
                  </div>
                  <div className="ticket-summary-compact">
                    {ticketModeState === 'live' && liveCommand ? (
                      <>
                        <span>{liveCommand.ticketPressure.label}</span>
                        <span>
                          {
                            liveCommand.legs.filter(
                              (leg) =>
                                leg.status === 'cleared' ||
                                leg.status === 'ahead of pace' ||
                                leg.status === 'on pace'
                            ).length
                          }
                          /{liveCommand.legs.length} holding
                        </span>
                      </>
                    ) : ticketModeState === 'after' && liveCommand?.after ? (
                      <>
                        <span>{liveCommand.after.outcomeLabel}</span>
                        <span>
                          {liveCommand.after.breakingLegHighlight
                            ? 'Weakest leg preserved'
                            : 'No break leg preserved'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Hit est. {compactLine.hitEstimate}</span>
                        <span>Gap {compactLine.gap}</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="ticket-summary-recommendation">
                  {ticketModeState === 'live' || ticketModeState === 'after'
                    ? (liveCommand?.attention ?? ticketSummary.recommendation)
                    : ticketSummary.recommendation}
                </p>
                <p className="ticket-summary-next">
                  {ticketModeState === 'live' || ticketModeState === 'after'
                    ? (liveCommand?.recommendation ?? ticketSummary.nextAction)
                    : ticketSummary.nextAction}
                </p>
              </section>

              {ticketModeState === 'live' && liveCommand ? (
                <section className="live-ticket-surface" aria-label="Live tracked ticket">
                  <div className="live-ticket-insight">
                    <span className="ticket-insight-kicker">Pay attention now</span>
                    <h3>{liveCommand.attention}</h3>
                    <p>{liveCommand.gameScript}</p>
                  </div>

                  <div className="live-ticket-metrics">
                    <article className="ticket-insight-block ticket-insight-feature">
                      <span className="ticket-insight-kicker">Strongest leg</span>
                      <h3>
                        {liveCommand.strongestLeg
                          ? `${liveCommand.strongestLeg.player} ${liveCommand.strongestLeg.marketLabel}`
                          : 'Waiting for a carrying leg'}
                      </h3>
                      <p>
                        {liveCommand.strongestLeg
                          ? `${liveCommand.strongestLeg.progressLabel}. ${liveCommand.strongestLeg.why}`
                          : 'The ticket has not separated yet.'}
                      </p>
                    </article>
                    <article className="ticket-insight-block">
                      <span className="ticket-insight-kicker">Weakest leg</span>
                      <strong>
                        {liveCommand.weakestLeg
                          ? `${liveCommand.weakestLeg.player} · ${liveCommand.weakestLeg.status}`
                          : 'Waiting'}
                      </strong>
                      <p>{liveCommand.primaryFailurePoint}</p>
                    </article>
                    <article className="ticket-insight-block">
                      <span className="ticket-insight-kicker">Ticket pressure</span>
                      <strong>{liveCommand.ticketPressure.label}</strong>
                      <p>{liveCommand.ticketPressure.detail}</p>
                    </article>
                  </div>

                  <div className="ticket-legs-header">
                    <p className="ticket-legs-label">Live leg status</p>
                    <p className="ticket-legs-hint">
                      See what is carrying the ticket and what is breaking it without leaving the
                      same surface.
                    </p>
                  </div>
                  <div className="ticket-legs live-ticket-legs" role="list">
                    {liveCommand.legs.map((leg) => (
                      <div
                        key={leg.legId}
                        className={`ticket-leg live-ticket-leg ${leg.isWeakest ? 'weakest target-lock heat' : ''} ${leg.isStrongest ? 'live-leg-strongest' : ''}`}
                      >
                        <div>
                          <div className="ticket-leg-main">
                            {leg.player} · {leg.marketLabel}
                          </div>
                          <div className="ticket-leg-sub">{leg.progressLabel}</div>
                          <div className="ticket-leg-sub">{leg.why}</div>
                        </div>
                        <span
                          className={`live-leg-status live-status-${leg.status.replace(/\s+/g, '-')}`}
                        >
                          {leg.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : ticketModeState === 'after' && trackedContext.postmortem ? (
                <section className="live-ticket-surface" aria-label="Ticket review handoff">
                  <div className="live-ticket-insight">
                    <span className="ticket-insight-kicker">Outcome review</span>
                    <h3>{liveCommand?.after?.closingHeadline ?? 'Review outcome preserved.'}</h3>
                    <p>
                      {liveCommand?.after?.decidedBy ??
                        liveCommand?.attention ??
                        'Settlement preserved the deciding leg.'}
                    </p>
                  </div>
                  <div className="live-ticket-metrics">
                    <article className="ticket-insight-block ticket-insight-feature">
                      <span className="ticket-insight-kicker">Strongest leg</span>
                      <h3>
                        {liveCommand?.after?.winningLegHighlight
                          ? `${liveCommand.after.winningLegHighlight.player} ${liveCommand.after.winningLegHighlight.marketLabel}`
                          : 'No cleared leg preserved'}
                      </h3>
                      <p>
                        {liveCommand?.after?.winningLegHighlight?.why ??
                          'Settlement did not preserve a single carrying winner.'}
                      </p>
                    </article>
                    <article className="ticket-insight-block">
                      <span className="ticket-insight-kicker">Weakest leg</span>
                      <strong>
                        {liveCommand?.after?.breakingLegHighlight
                          ? `${liveCommand.after.breakingLegHighlight.player} · ${liveCommand.after.breakingLegHighlight.status}`
                          : 'No breaking leg preserved'}
                      </strong>
                      <p>
                        {liveCommand?.after?.breakingLegHighlight?.why ??
                          liveCommand?.primaryFailurePoint}
                      </p>
                    </article>
                    <article className="ticket-insight-block">
                      <span className="ticket-insight-kicker">What to learn</span>
                      <strong>
                        {liveCommand?.after?.nearMissHighlight ?? 'No near-miss proof preserved'}
                      </strong>
                      <p>{liveCommand?.after?.lesson ?? liveCommand?.recommendation}</p>
                    </article>
                  </div>
                </section>
              ) : legCount === 0 ? (
                <div className="ticket-empty ticket-empty-state">
                  <div className="ticket-empty-text">
                    Build a 2–4 leg ticket to expose weakest-leg and correlation pressure before
                    lock.
                  </div>
                  <p className="ticket-empty-subcopy">
                    Add legs from Tonight&apos;s Board. The ticket will sharpen into risk posture,
                    pressure points, and a clear next action as soon as it has shape.
                  </p>
                  <div className="ticket-empty-preview" aria-label="Draft ticket unlocks">
                    <div className="ticket-preview-item">
                      <span className="ticket-preview-label">When you add legs</span>
                      <strong>Ticket shape becomes readable</strong>
                    </div>
                    <div className="ticket-preview-item">
                      <span className="ticket-preview-label">When you run analysis</span>
                      <strong>Weakest leg and correlation pressure surface</strong>
                    </div>
                  </div>
                  <TicketEmptyCoach
                    sampleHref={spineHref('/cockpit', nervous, {
                      mode: 'demo',
                      trace_id: analysis.traceId || nervous.trace_id
                    })}
                  />
                </div>
              ) : (
                <>
                  <div className="ticket-legs-header">
                    <p className="ticket-legs-label">Current build</p>
                    <p className="ticket-legs-hint">
                      Every add lands here immediately. Trim fast, then decide when to run.
                    </p>
                  </div>
                  <div className="ticket-legs" role="list">
                    {slip.map((leg) => (
                      <div
                        key={leg.id}
                        className={`ticket-leg ${analysis.weakestId === leg.id ? 'weakest target-lock heat' : ''}`}
                      >
                        <div>
                          <div className="ticket-leg-main">
                            {leg.player} · {leg.marketType} {leg.line}
                          </div>
                          <div className="ticket-leg-sub">
                            {leg.game ?? '—'} · {leg.odds}
                          </div>
                        </div>
                        <button
                          className="remove-btn"
                          onClick={() => onRemove(leg.id)}
                          aria-label={`Remove ${leg.player}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {ticketSummary.showInsightBlocks && ticketModeState === 'analysis' ? (
                <section className="ticket-insight-grid" aria-label="Draft ticket insights">
                  <article className="ticket-insight-block ticket-insight-feature">
                    <span className="ticket-insight-kicker">Signature insight</span>
                    <h3>
                      {analysis.stage !== 'Before' && analysis.weakestLabel
                        ? ticketSummary.weakestDetailTitle
                        : ticketSummary.weakestPreviewTitle}
                    </h3>
                    <p>
                      {analysis.stage !== 'Before' && analysis.weakestLabel
                        ? ticketSummary.weakestDetailBody
                        : ticketSummary.weakestPreviewBody}
                    </p>
                  </article>
                  <article className="ticket-insight-block">
                    <span className="ticket-insight-kicker">Correlation pressure</span>
                    <strong>{ticketSummary.correlationValue}</strong>
                    <p>{ticketSummary.correlationBody}</p>
                  </article>
                  <article className="ticket-insight-block">
                    <span className="ticket-insight-kicker">Fragility index</span>
                    <strong>{ticketSummary.fragilityValue}</strong>
                    <p>{ticketSummary.fragilityBody}</p>
                  </article>
                </section>
              ) : null}

              {legCount >= 2 && ticketModeState === 'analysis' ? (
                <SlipIntelBar
                  legs={slip.map((leg) => ({
                    id: leg.id,
                    player: leg.player,
                    marketType: leg.marketType,
                    line: leg.line,
                    odds: leg.odds,
                    game: leg.game
                  }))}
                  className="ticket-intel"
                />
              ) : null}

              {analysis.traceId && analysis.stage !== 'Before' && !analysis.running ? (
                <RunIntegrityPanel
                  traceId={analysis.traceId}
                  runProvenance={analysis.runProvenance}
                  boardProvenance={provenance}
                  traceHref={nervous.toHref(`/traces/${encodeURIComponent(analysis.traceId)}`)}
                />
              ) : null}
            </div>

            <div className="ticket-cta-row">
              <Button
                intent="primary"
                onClick={runStressTest}
                disabled={!stressEnabled || analysis.running || ticketModeState === 'live'}
              >
                {ticketModeState === 'analysis' ? 'Refresh analysis' : 'Run analysis'}
              </Button>
              <Button
                intent="secondary"
                onClick={() => setUi((p) => ({ ...p, saveModalOpen: true }))}
              >
                {ticketModeState === 'live' ? 'Save ticket snapshot' : 'Save analysis'}
              </Button>
            </div>
            {phaseStep ? (
              <p className="phase-strip" data-testid="phase-strip">{`Phase: ${phaseStep}`}</p>
            ) : null}
            {ticketModeState === 'live' && trackedContext.ticket ? (
              <div className="ticket-link-row">
                <Link
                  href={nervous.toHref('/track', {
                    trace_id:
                      trackedContext.ticket.trace_id ?? analysis.traceId ?? nervous.trace_id,
                    slip_id: trackedContext.ticket.slip_id,
                    tab: 'during'
                  })}
                  className="ui-button ui-button-secondary focus-glow ticket-track-link"
                >
                  Open live tracking
                </Link>
                <Link
                  href={spineHref('/control', nervous, {
                    tab: 'review',
                    trace_id:
                      trackedContext.ticket.trace_id ?? analysis.traceId ?? nervous.trace_id,
                    slip_id: trackedContext.ticket.slip_id
                  })}
                  className="ui-button ui-button-secondary focus-glow ticket-track-link"
                >
                  Review outcome
                </Link>
              </div>
            ) : null}
            {ticketModeState === 'after' && trackedContext.postmortem ? (
              <div className="ticket-link-row">
                <Link
                  href={spineHref('/control', nervous, {
                    tab: 'review',
                    trace_id:
                      trackedContext.postmortem.trace_id ?? analysis.traceId ?? nervous.trace_id,
                    slip_id: trackedContext.postmortem.slip_id
                  })}
                  className="ui-button ui-button-secondary focus-glow ticket-track-link"
                >
                  {liveCommand?.nextActionLabel ?? 'Open postmortem'}
                </Link>
                <Link
                  href={nervous.toHref('/history')}
                  className="ui-button ui-button-secondary focus-glow ticket-track-link"
                >
                  Open history
                </Link>
              </div>
            ) : null}
            {analysis.traceId && analysis.stage !== 'Before' && ticketModeState === 'analysis' ? (
              <Link
                href={nervous.toHref('/track', {
                  trace_id: analysis.traceId,
                  tab: 'during',
                  continuity: 'staged_ticket',
                  slip_id: draftSlipId
                })}
                className="ui-button ui-button-secondary focus-glow ticket-track-link"
              >
                Continue to track
              </Link>
            ) : null}
          </Panel>
        </section>

        <section className="signals-section" aria-label="Supporting board reads">
          <div className="signals-head">
            <h2>Quick adds</h2>
            <p>Real props worth a faster second look before you build the ticket.</p>
          </div>
          {scoutSignals.length === 0 ? (
            <p className="signals-empty">
              Board is loading. Quick adds will appear as props settle in.
            </p>
          ) : (
            <div className="signals-grid">
              {scoutSignals.map((signal) => (
                <button
                  key={signal.id}
                  className="signal-card"
                  onClick={() => onAnalyzeLeg(signal.leg)}
                >
                  <p className="signal-card-title">{signal.headline}</p>
                  <p className="signal-card-note">{signal.note}</p>
                  <span className="signal-card-context">{signal.context}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <details className="diagnostics-disclosure" data-testid="cockpit-details-disclosure">
          <summary>
            {diagnosticsReady ? 'Show system details' : 'Show system details after analysis'}
          </summary>
          {diagnosticsReady ? (
            <div className="diagnostics-content">
              <PreviewStrip
                rows={board}
                statusLabel={previewStatusLabel}
                buildHref={spineHref('/today', nervous, {
                  trace_id: analysis.traceId || nervous.trace_id
                })}
                pasteHref={spineHref('/ingest', nervous, {
                  trace_id: analysis.traceId || nervous.trace_id
                })}
                onPaste={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}
              />
              <LiveCredibilityStrip
                provenance={provenance}
                today={today}
                strictLiveUnavailable={strictLiveUnavailable}
                boardUpdateTick={boardUpdateTick}
                onRefresh={refreshToday}
                pulseToken={pulseToken}
              />
            </div>
          ) : null}
        </details>

        <section className="mobile-slip-bar" aria-label="Slip Bar" data-testid="mobile-slip-bar">
          <div>
            <p className="mobile-slip-count">
              {ticketModeState === 'live'
                ? 'Active Ticket'
                : ticketModeState === 'after'
                  ? 'Ticket Review'
                  : 'Draft Ticket'}{' '}
              · {ticketSummary.countLabel}
            </p>
            <p className="mobile-slip-line">
              {ticketModeState === 'live' || ticketModeState === 'after'
                ? (liveCommand?.attention ?? ticketSummary.recommendation)
                : ticketSummary.analysisReady
                  ? ticketSummary.recommendation
                  : 'Add 2–4 legs, then run analysis.'}
            </p>
          </div>
          <button
            ref={mobileTicketCtaRef}
            className="ui-button ui-button-primary focus-glow"
            onClick={() => setUi((p) => ({ ...p, slipSheetOpen: true }))}
          >
            Open Ticket
          </button>
        </section>

        <div
          className={`slip-sheet-overlay ${ui.slipSheetOpen ? 'open' : ''}`}
          onClick={() => setUi((p) => ({ ...p, slipSheetOpen: false }))}
          aria-hidden={!ui.slipSheetOpen}
        />
        <aside
          className={`slip-sheet ${ui.slipSheetOpen ? 'open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Slip drawer"
          data-testid="slip-sheet"
        >
          <div className="slip-sheet-head">
            <h2>
              {ticketModeState === 'live'
                ? 'Active Ticket'
                : ticketModeState === 'after'
                  ? 'Ticket Review'
                  : 'Draft Ticket'}
            </h2>
            <button
              className="remove-btn"
              onClick={() => setUi((p) => ({ ...p, slipSheetOpen: false }))}
              aria-label="Close slip drawer"
            >
              ✕
            </button>
          </div>
          <div className="slip-sheet-body">
            <section
              className="ticket-summary-card mobile-ticket-summary"
              aria-label="Mobile draft ticket summary"
            >
              <div className="ticket-summary-topline">
                <span className="ticket-summary-kicker">Decision room</span>
                <span
                  className={`ticket-status-pill ${ticketSummary.analysisReady ? 'ready' : 'setup'}`}
                >
                  {ticketSummary.analysisReady ? 'Analysis-ready' : 'Setup state'}
                </span>
              </div>
              <p className="ticket-summary-count">{ticketSummary.countLabel}</p>
              <h3 className="ticket-summary-headline">{ticketSummary.shapeLabel}</h3>
              <p className="ticket-summary-recommendation">{ticketSummary.recommendation}</p>
            </section>
            {legCount === 0 ? (
              <div className="ticket-empty">
                <div className="ticket-empty-text">
                  Build a 2–4 leg ticket to reveal the main pressure point before lock.
                </div>
              </div>
            ) : (
              <div className="ticket-legs" role="list">
                {slip.map((leg) => (
                  <div
                    key={leg.id}
                    className={`ticket-leg ${analysis.weakestId === leg.id ? 'weakest target-lock heat' : ''}`}
                  >
                    <div>
                      <div className="ticket-leg-main">
                        {leg.player} · {leg.marketType}
                      </div>
                      <div className="ticket-leg-sub">{leg.game ?? '—'}</div>
                      <div className="sheet-edit-row">
                        <label>
                          <span>Line</span>
                          <input
                            value={leg.line}
                            onChange={(e) => onEditLeg(leg.id, 'line', e.target.value)}
                          />
                        </label>
                        <label>
                          <span>Odds</span>
                          <input
                            value={leg.odds ?? ''}
                            onChange={(e) => onEditLeg(leg.id, 'odds', e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => onRemove(leg.id)}
                      aria-label={`Remove ${leg.player}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="slip-sheet-actions">
            <button
              className={`ui-button ui-button-primary focus-glow ${stressEnabled ? '' : 'disabled'}`}
              aria-disabled={!stressEnabled}
              onClick={() => {
                if (stressEnabled) void runStressTest();
              }}
            >
              {stressEnabled ? 'Run analysis' : 'Add one more leg'}
            </button>
            <Link
              href={spineHref('/cockpit', nervous, { mode: 'demo' })}
              className="ui-button ui-button-secondary focus-glow"
            >
              Try sample slip
            </Link>
          </div>
        </aside>

        <div
          className={`drawer-overlay ${ui.navDrawerOpen ? 'open' : ''}`}
          onClick={() => setUi((p) => ({ ...p, navDrawerOpen: false }))}
        />
        <aside
          id="drawer"
          className={ui.navDrawerOpen ? 'open' : ''}
          aria-hidden={!ui.navDrawerOpen}
        >
          <button
            className="drawer-close"
            onClick={() => setUi((p) => ({ ...p, navDrawerOpen: false }))}
          >
            Close
          </button>
          <nav>
            <a href="#cockpit">Cockpit</a>
          </nav>
        </aside>

        <div
          className={`modal-overlay ${ui.pasteModalOpen ? 'open' : ''}`}
          onClick={(e) =>
            e.currentTarget === e.target && setUi((p) => ({ ...p, pasteModalOpen: false }))
          }
        >
          <div className="modal">
            <h2>Paste slip</h2>
            <textarea
              ref={pasteInputRef}
              placeholder="Paste slips to ingest through submit + extract."
            />
            <button
              className="btn-secondary"
              onClick={() => setUi((p) => ({ ...p, pasteModalOpen: false }))}
            >
              Close
            </button>
          </div>
        </div>

        <div
          className={`modal-overlay ${ui.saveModalOpen ? 'open' : ''}`}
          onClick={(e) =>
            e.currentTarget === e.target && setUi((p) => ({ ...p, saveModalOpen: false }))
          }
        >
          <div className="modal">
            <h2>Save analysis</h2>
            <input
              ref={saveInputRef}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <button
              className="btn-secondary"
              onClick={saveAnalysis}
              disabled={saveState === 'saving' || !email.trim()}
            >
              {saveState === 'saved' ? 'Saved' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </CockpitShell>
  );
}
