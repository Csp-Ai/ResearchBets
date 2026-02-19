'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { AgentNetworkBackground } from '@/features/landing/AgentNetworkBackground';
import { landingEase, landingMotion, sectionRevealVariants, staggerGroup, staggerItem } from '@/features/landing/motionTokens';

const LOOP_MS = 24000;
const FINAL_CONFIDENCE = 72;
const TARGET_RISK = 63;

const legs = [
  'Luka Doncic 30+ points',
  'LeBron James 6+ assists',
  'Karl-Anthony Towns 2+ threes'
];

export function LandingHero() {
  const shouldReduceMotion = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  const [elapsed, setElapsed] = useState(0);

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

    return {
      slipVisible,
      parsedLegs,
      weakestVisible,
      confidence: Math.round(FINAL_CONFIDENCE * confidenceProgress),
      risk: Math.round(TARGET_RISK * riskProgress),
      verdictVisible
    };
  }, [elapsed]);

  return (
    <motion.section
      variants={sectionRevealVariants}
      initial="hidden"
      animate="visible"
      className="terminal-panel relative overflow-hidden rounded-2xl p-8"
    >
      <AgentNetworkBackground />
      <div className="hero-grid pointer-events-none absolute inset-0" />
      <div className="hero-radial pointer-events-none absolute inset-0" />

      <motion.div variants={staggerGroup} initial="hidden" animate="visible" className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <motion.p variants={staggerItem} className="text-xs uppercase tracking-[0.22em] text-cyan-300/90">
            Research Terminal
          </motion.p>
          <motion.h1 variants={staggerItem} className="mt-2 text-4xl font-semibold leading-tight lg:text-5xl">
            Run the slip. Isolate fragility. Decide with precision.
          </motion.h1>
          <motion.p variants={staggerItem} className="mt-4 max-w-2xl text-sm text-slate-300">
            ResearchBets surfaces weak links, confidence trajectory, and risk posture in one tactical stream. No picks,
            no hype, just operational betting analysis.
          </motion.p>
          <motion.div variants={staggerItem} className="mt-6 flex flex-wrap gap-3">
            <Link href="/ingest" className="interactive-button rounded-md bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950">
              Paste Slip
            </Link>
            <Link href="/research?snapshot=demo" className="interactive-button rounded-md border border-slate-600 bg-slate-900/70 px-4 py-2 text-sm">
              Launch Demo Verdict
            </Link>
          </motion.div>
        </div>

        <motion.div variants={staggerItem} className="relative rounded-xl border border-slate-700/80 bg-slate-950/75 p-4 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Live Analysis Simulation</p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: timeline.slipVisible ? 1 : 0, y: timeline.slipVisible ? 0 : 10 }}
            transition={{ duration: landingMotion.base, ease: landingEase }}
            className="mt-3 rounded-md border border-slate-700 bg-slate-900/85 p-3 text-xs text-slate-200"
          >
            Slip received: 3-leg NBA parlay
          </motion.div>

          <div className="mt-3 space-y-2">
            {legs.map((leg, index) => {
              const isWeak = index === 2 && timeline.weakestVisible;

              return (
                <motion.div
                  key={leg}
                  initial={false}
                  animate={{ opacity: timeline.parsedLegs[index] ? 1 : 0, x: timeline.parsedLegs[index] ? 0 : -8 }}
                  transition={{ duration: landingMotion.fast, ease: landingEase }}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    isWeak
                      ? 'border-amber-400/55 bg-amber-500/10 text-amber-100'
                      : 'border-slate-700 bg-slate-900/80 text-slate-200'
                  }`}
                >
                  <p className="font-medium">{leg}</p>
                  <p className={`mt-1 text-[11px] ${isWeak ? 'text-amber-200' : 'text-slate-400'}`}>
                    {isWeak ? 'Weakest-leg volatility detected' : 'Parsed and scored'}
                  </p>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-slate-700 bg-slate-900/80 p-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Confidence</p>
              <p className="mt-1 text-xl font-semibold text-cyan-200">{timeline.confidence}%</p>
            </div>
            <div className="rounded-md border border-slate-700 bg-slate-900/80 p-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Risk Meter</p>
              <div className="mt-2 h-2 rounded-full bg-slate-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 via-amber-400 to-rose-400"
                  animate={{ width: `${timeline.risk}%` }}
                  transition={{ duration: landingMotion.slow, ease: landingEase }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-300">{timeline.risk < 40 ? 'Low' : timeline.risk < 67 ? 'Medium' : 'Elevated'}</p>
            </div>
          </div>

          <motion.div
            initial={false}
            animate={{ opacity: timeline.verdictVisible ? 1 : 0, y: timeline.verdictVisible ? 0 : 6 }}
            transition={{ duration: landingMotion.base, ease: 'easeInOut' }}
            className="mt-4 inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100"
          >
            Verdict: MODIFY — Replace KAT 2+ threes
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
