'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { AgentNetworkBackground } from '@/features/landing/AgentNetworkBackground';
import { HeroDepthLayer } from '@/features/landing/HeroDepthLayer';
import { sectionRevealVariants, staggerGroup, staggerItem } from '@/features/landing/motionTokens';

export function LandingHero() {
  return (
    <motion.section variants={sectionRevealVariants} initial="hidden" animate="visible" className="relative isolate min-h-[84vh] overflow-x-hidden px-4 py-8 sm:px-6 lg:px-10">
      <HeroDepthLayer />
      <AgentNetworkBackground active />
      <div className="hero-grid pointer-events-none absolute inset-0 z-0" />

      <motion.div variants={staggerGroup} initial="hidden" animate="visible" className="relative z-20 mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.p variants={staggerItem} className="text-xs uppercase tracking-[0.22em] text-cyan-300/90">Anonymous-first betting research</motion.p>
          <motion.h1 variants={staggerItem} className="mt-2 max-w-[16ch] text-4xl font-semibold leading-tight sm:text-5xl">From slip to insight in seconds.</motion.h1>
          <motion.p variants={staggerItem} className="mt-3 max-w-xl text-sm text-slate-200">Paste a slip, get ranked leg risk, and inspect evidence only when you need it. No account required to start.</motion.p>
          <motion.div variants={staggerItem} className="mt-5 flex flex-wrap gap-3">
            <Link href="/ingest" className="interactive-button rounded-md bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950">Start with a slip</Link>
            <Link href="/research?demo=1" className="interactive-button rounded-md border border-slate-500 bg-slate-900/80 px-5 py-2.5 text-sm font-medium text-slate-100">Watch demo replay</Link>
          </motion.div>
        </div>

        <motion.div variants={staggerItem} className="terminal-panel rounded-xl border border-slate-700/90 bg-slate-950/72 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Product loop</p>
          <ol className="mt-3 space-y-3 text-sm">
            <li className="rounded-lg border border-slate-700 bg-slate-900/80 p-3"><span className="font-semibold text-cyan-200">1 · Ingest</span><p className="mt-1 text-slate-300">Paste slip text or import a ticket screenshot.</p></li>
            <li className="rounded-lg border border-slate-700 bg-slate-900/80 p-3"><span className="font-semibold text-cyan-200">2 · Analyze</span><p className="mt-1 text-slate-300">Get confidence, volatility, strongest and weakest legs.</p></li>
            <li className="rounded-lg border border-slate-700 bg-slate-900/80 p-3"><span className="font-semibold text-cyan-200">3 · Decide</span><p className="mt-1 text-slate-300">Open evidence + trace only when a leg looks fragile.</p></li>
          </ol>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
