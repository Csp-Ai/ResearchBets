'use client';

import { motion } from 'framer-motion';

import { sectionRevealVariants, staggerGroup, staggerItem } from '@/features/landing/motionTokens';

const steps = [
  { title: 'Ingest', body: 'Paste your slip and verify extracted legs in one pass.', badge: 'Slip parsed' },
  { title: 'Analyze', body: 'See confidence, volatility, and evidence strength per leg.', badge: 'Ranked insights' },
  { title: 'Decide', body: 'Inspect trace/evidence only for risky legs before locking a pick.', badge: 'Decision-ready' }
];

export function HowItWorks() {
  return (
    <motion.section variants={sectionRevealVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="terminal-panel rounded-xl p-5">
      <h2 className="text-lg font-semibold">Ingest → Analyze → Decide</h2>
      <motion.div variants={staggerGroup} className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <motion.article key={step.title} variants={staggerItem} className="lift-card rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-medium text-slate-100">{step.title}</p>
            <p className="mt-2 text-xs text-slate-400">{step.body}</p>
            <span className="meta-badge mt-3 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200">{step.badge}</span>
          </motion.article>
        ))}
      </motion.div>
    </motion.section>
  );
}
