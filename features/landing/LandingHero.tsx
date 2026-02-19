'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { AgentNetworkBackground } from '@/features/landing/AgentNetworkBackground';
import { HeroDepthLayer } from '@/features/landing/HeroDepthLayer';
import { landingEase, landingMotion, sectionRevealVariants, staggerGroup, staggerItem } from '@/features/landing/motionTokens';

const LOOP_MS = 24000;

const legs = ['Luka Dončić — Points', 'LeBron James — Assists', 'Karl-Anthony Towns — 3PT makes'];

export function LandingHero() {
  const shouldReduceMotion = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [commandPulse, setCommandPulse] = useState(false);
  const [panelFocused, setPanelFocused] = useState(false);

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
    const checksProgress = Math.max(0, Math.min(8, Math.floor((elapsed - 3200) / 550)));
    const warningsVisible = elapsed > 4600;
    const flaggedVisible = elapsed > 5400;

    return {
      slipVisible,
      parsedLegs,
      checksProgress,
      warningsVisible,
      flaggedVisible
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
      className="relative isolate min-h-screen overflow-x-hidden px-4 py-6 sm:px-6 lg:px-10"
    >
      <HeroDepthLayer />
      <AgentNetworkBackground active={!shouldReduceMotion && panelFocused} />
      <div className="hero-grid pointer-events-none absolute inset-0 z-0" />

      <motion.div
        variants={staggerGroup}
        initial="hidden"
        animate="visible"
        className="relative z-20 mx-auto grid w-full max-w-[1400px] grid-rows-[auto_1fr_auto] gap-4 md:gap-3 lg:gap-2"
      >
        <div className="pointer-events-auto row-start-1 flex items-end">
          <div className="max-w-[36rem] pb-1.5 sm:pb-2">
            <motion.p variants={staggerItem} className="text-xs uppercase tracking-[0.22em] text-cyan-300/90">
              Research workspace
            </motion.p>
            <motion.h1 variants={staggerItem} className="mt-2 max-w-[15ch] text-4xl font-semibold leading-[1.04] sm:text-5xl lg:text-[3.45rem]">
              Research a slip before you place it.
            </motion.h1>
            <motion.p variants={staggerItem} className="mt-3 max-w-[34rem] text-sm text-slate-200">
              Extract legs → verify context → review what&apos;s fragile. No picks.
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
                View demo trace
              </Link>
            </motion.div>
          </div>
        </div>

        <div className="row-start-2 flex items-center justify-center">
          <motion.div variants={staggerItem} className="terminal-shell-outer relative w-full rounded-2xl p-1.5 sm:p-2 md:w-[min(78vw,1280px)]">
            <div
              className={`terminal-shell-inner relative rounded-[1.1rem] p-3 sm:p-4 lg:p-5 ${panelFocused && !shouldReduceMotion ? 'terminal-panel-active' : ''} ${
                commandPulse ? 'terminal-command-pulse' : ''
              }`}
              onMouseEnter={() => setPanelFocused(true)}
              onMouseLeave={() => setPanelFocused(false)}
              onFocusCapture={() => setPanelFocused(true)}
              onBlurCapture={() => setPanelFocused(false)}
            >
              <div className="terminal-panel relative rounded-xl border border-slate-700/90 bg-slate-950/72 p-3 sm:p-4 lg:p-5">
                <p className="parse-status text-[10px] uppercase tracking-[0.2em] text-slate-300">Trace preview</p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: timeline.slipVisible ? 1 : 0, y: timeline.slipVisible ? 0 : 10 }}
                  transition={{ duration: landingMotion.base, ease: landingEase }}
                  className="mt-2 rounded-md border border-slate-700 bg-slate-900/85 p-2 text-[11px] text-slate-100"
                >
                  Example slip loaded: 3 NBA props
                </motion.div>

                <div className="mt-2.5 rounded-md border border-slate-700 bg-slate-900/80 p-2.5">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-300">Example legs (demo)</p>
                  <div className="mt-1.5 space-y-1.5">
                    {legs.map((leg, index) => (
                      <motion.div
                        key={leg}
                        initial={false}
                        animate={{ opacity: timeline.parsedLegs[index] ? 1 : 0, x: timeline.parsedLegs[index] ? 0 : -8 }}
                        transition={{ duration: landingMotion.fast, ease: landingEase }}
                        className="rounded-md border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-slate-100"
                      >
                        <p className="font-medium leading-tight">{leg}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
                  <div className="rounded-md border border-slate-700 bg-slate-900/80 p-2">
                    <p className="uppercase tracking-[0.16em] text-slate-300">Evidence</p>
                    <p className="mt-1 text-xs font-medium text-cyan-100">{timeline.checksProgress}/8 checks</p>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900/80 p-2">
                    <p className="uppercase tracking-[0.16em] text-slate-300">Warnings</p>
                    <p className="mt-1 text-xs font-medium text-slate-100">{timeline.warningsVisible ? '2' : '0'}</p>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900/80 p-2">
                    <p className="uppercase tracking-[0.16em] text-slate-300">Last updated</p>
                    <p className="mt-1 text-xs font-medium text-slate-100">just now</p>
                  </div>
                  <div className="rounded-md border border-amber-400/45 bg-amber-400/10 p-2">
                    <p className="uppercase tracking-[0.16em] text-amber-100">Flagged</p>
                    <p className="mt-1 text-xs font-medium text-amber-100">{timeline.flaggedVisible ? '1 fragile leg' : '0'}</p>
                  </div>
                </div>
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
