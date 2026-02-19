'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { AgentNetworkBackground } from '@/features/landing/AgentNetworkBackground';
import { HeroDepthLayer } from '@/features/landing/HeroDepthLayer';
import { landingEase, landingMotion, sectionRevealVariants, staggerGroup, staggerItem } from '@/features/landing/motionTokens';

const LOOP_MS = 24000;
const FINAL_CONFIDENCE = 72;
const TARGET_RISK = 63;

const legs = ['Luka Doncic 30+ points', 'LeBron James 6+ assists', 'Karl-Anthony Towns 2+ threes'];

export function LandingHero() {
  const shouldReduceMotion = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [commandPulse, setCommandPulse] = useState(false);

  useEffect(() => {
    if (shouldReduceMotion) {
      setElapsed(7200);
      return;
    }

    const start = Date.now();
    const ticker = window.setInterval(() => {
      setElapsed(Date.now() - start);
    }, 50);

    return () => window.clearInterval(ticker);
  }, [cycle, shouldReduceMotion]);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const loop = window.setInterval(() => {
      setCycle((value) => value + 1);
    }, LOOP_MS);

    return () => window.clearInterval(loop);
  }, [shouldReduceMotion]);

  const timeline = useMemo(() => {
    const slipVisible = elapsed > 200;
    const parsedLegs = legs.map((_, index) => elapsed > 1100 + index * 700);
    const weakestVisible = elapsed > 3500;
    const confidenceProgress = Math.max(0, Math.min(1, (elapsed - 4000) / 1800));
    const riskProgress = Math.max(0, Math.min(1, (elapsed - 4500) / 1800));
    const verdictVisible = elapsed > 6700;
    const parsingActive = elapsed > 750 && elapsed < 6200;

    return {
      slipVisible,
      parsedLegs,
      weakestVisible,
      confidence: Math.round(FINAL_CONFIDENCE * confidenceProgress),
      risk: Math.round(TARGET_RISK * riskProgress),
      verdictVisible,
      parsingActive
    };
  }, [elapsed]);

  const handleCommandFocus = () => {
    if (shouldReduceMotion) {
      return;
    }

    setCommandPulse(true);
    window.setTimeout(() => {
      setCommandPulse(false);
    }, 220);
  };

  return (
    <motion.section
      variants={sectionRevealVariants}
      initial="hidden"
      animate="visible"
      className="relative isolate min-h-[100svh] overflow-hidden px-4 py-6 sm:px-6 lg:px-10"
    >
      <HeroDepthLayer />
      <AgentNetworkBackground active={timeline.parsingActive} />
      <div className="hero-grid pointer-events-none absolute inset-0 z-0" />

      <motion.div
        variants={staggerGroup}
        initial="hidden"
        animate="visible"
        className="relative z-20 mx-auto grid h-[calc(100svh-3rem)] w-full max-w-[1400px] grid-rows-[auto_1fr_auto] gap-4 md:gap-3 lg:gap-2 md:[grid-template-rows:clamp(194px,24svh,252px)_minmax(0,1fr)_auto]"
      >
        <div className="pointer-events-auto row-start-1 flex items-end">
          <div className="max-w-[36rem] pb-1.5 sm:pb-2">
            <motion.p variants={staggerItem} className="text-xs uppercase tracking-[0.22em] text-cyan-300/90">
              Research Terminal
            </motion.p>
            <motion.h1 variants={staggerItem} className="mt-2 max-w-[15ch] text-4xl font-semibold leading-[1.04] sm:text-5xl lg:text-[3.45rem]">
              Run the slip. Isolate fragility. Decide with precision.
            </motion.h1>
            <motion.p variants={staggerItem} className="mt-3 max-w-[34rem] text-sm text-slate-200">
              ResearchBets surfaces weak links, confidence trajectory, and risk posture in one tactical stream.
            </motion.p>
            <motion.div variants={staggerItem} className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/ingest"
                onMouseEnter={handleCommandFocus}
                onFocus={handleCommandFocus}
                className="interactive-button terminal-command rounded-md bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950"
              >
                &gt; Paste Slip
              </Link>
              <Link
                href="/research?snapshot=demo"
                className="interactive-button rounded-md border border-slate-500 bg-slate-900/80 px-5 py-2.5 text-sm font-medium text-slate-100"
              >
                Launch Demo Verdict
              </Link>
            </motion.div>
          </div>
        </div>

        <div className="row-start-2 flex h-[calc(100svh-clamp(194px,24svh,252px)-4.5rem)] items-center justify-center md:h-[calc(100svh-clamp(194px,24svh,252px)-5rem)]">
          <motion.div variants={staggerItem} className="terminal-shell-outer relative h-full w-full rounded-2xl p-1.5 sm:p-2 md:w-[min(78vw,1280px)]">
            <div
              className={`terminal-shell-inner relative h-full rounded-[1.1rem] p-3 sm:p-4 lg:p-5 ${
                timeline.parsingActive && !shouldReduceMotion ? 'terminal-panel-active' : ''
              } ${commandPulse ? 'terminal-command-pulse' : ''}`}
            >
              <div className="terminal-panel relative h-full rounded-xl border border-slate-700/90 bg-slate-950/72 p-3 sm:p-4 lg:p-5">
                <p className="parse-status text-[10px] uppercase tracking-[0.2em] text-slate-300">Live Analysis Simulation</p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: timeline.slipVisible ? 1 : 0, y: timeline.slipVisible ? 0 : 10 }}
                  transition={{ duration: landingMotion.base, ease: landingEase }}
                  className="mt-2 rounded-md border border-slate-700 bg-slate-900/85 p-2 text-[11px] text-slate-100"
                >
                  Slip received: 3-leg NBA parlay
                </motion.div>

                <div className="mt-2.5 space-y-1.5">
                  {legs.map((leg, index) => {
                    const isWeak = index === 2 && timeline.weakestVisible;

                    return (
                      <motion.div
                        key={leg}
                        initial={false}
                        animate={{ opacity: timeline.parsedLegs[index] ? 1 : 0, x: timeline.parsedLegs[index] ? 0 : -8 }}
                        transition={{ duration: landingMotion.fast, ease: landingEase }}
                        className={`rounded-md border px-2.5 py-1.5 text-[11px] ${
                          isWeak ? 'border-amber-400/55 bg-amber-500/10 text-amber-100' : 'border-slate-700 bg-slate-900/80 text-slate-100'
                        }`}
                      >
                        <p className="font-medium leading-tight">{leg}</p>
                        <p className={`mt-0.5 text-[10px] ${isWeak ? 'text-amber-200' : 'text-slate-300'}`}>
                          {isWeak ? 'Weakest-leg volatility detected' : 'Parsed and scored'}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div className={`rounded-md border border-slate-700 bg-slate-900/80 p-2 ${timeline.parsingActive ? 'confidence-active' : ''}`}>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-slate-300">Confidence</p>
                    <p className="mt-0.5 text-lg font-semibold text-cyan-100">{timeline.confidence}%</p>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900/80 p-2">
                    <p className="text-[9px] uppercase tracking-[0.16em] text-slate-300">Risk Meter</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-800">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-teal-400 via-amber-400 to-rose-400"
                        animate={{ width: `${timeline.risk}%` }}
                        transition={{ duration: landingMotion.slow, ease: landingEase }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-200">{timeline.risk < 40 ? 'Low' : timeline.risk < 67 ? 'Medium' : 'Elevated'}</p>
                  </div>
                </div>

                <motion.div
                  initial={false}
                  animate={{ opacity: timeline.verdictVisible ? 1 : 0, y: timeline.verdictVisible ? 0 : 6 }}
                  transition={{ duration: landingMotion.base, ease: 'easeInOut' }}
                  className="mt-2.5 inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100"
                >
                  Verdict: MODIFY — Replace KAT 2+ threes
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          variants={staggerItem}
          className="pointer-events-none row-start-3 flex items-center justify-center pb-0.5 text-[10px] uppercase tracking-[0.16em] text-cyan-100/70"
        >
          <span className={shouldReduceMotion ? '' : 'hero-scroll-cue'}>Scroll for methodology ↓</span>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
