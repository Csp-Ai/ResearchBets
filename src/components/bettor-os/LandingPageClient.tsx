'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { useMotionVariants } from './motion';

export function LandingPageClient({ hasRecentRun }: { hasRecentRun: boolean }) {
  const { fadeUp, stagger } = useMotionVariants();

  return (
    <motion.section initial="hidden" animate="show" variants={stagger} className="space-y-8">
      <motion.div variants={fadeUp} className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,#1f2a44,transparent_58%),#0f121a] p-8 shadow-2xl">
        <p className="text-sm text-cyan-300">Everyday Bettor OS</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight">Clearer slip calls, smarter props, and live context in seconds.</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">Paste your slip, get a verdict first, then quickly see the weakest leg and why it matters.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/ingest" className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Analyze a slip</Link>
          <Link href="/research?tab=scout" className="rounded-xl border border-white/20 px-4 py-2 text-sm">Scout props</Link>
          {hasRecentRun ? <Link href="/research" className="rounded-xl border border-white/20 px-4 py-2 text-sm">Continue last analysis</Link> : null}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <p className="text-sm text-slate-400">Live demo preview</p>
        <motion.div layout className="mt-3 space-y-3 text-sm">
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">Paste slip → <span className="text-slate-300">Tatum O29.5 pts, Luka O8.5 ast, LeBron O6.5 reb</span></div>
          <motion.div whileHover={{ scale: 1.01 }} className="rounded-lg border border-emerald-500/30 bg-emerald-900/20 p-3">
            <p className="font-medium text-emerald-200">Verdict: 63% confidence (research only)</p>
            <p className="mt-1 text-slate-300">Weakest leg: LeBron rebounds over 6.5 due to pace + fatigue angle.</p>
          </motion.div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-slate-300">Why peek: Dallas allows long boards, but back-to-back fatigue raises variance.</div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
