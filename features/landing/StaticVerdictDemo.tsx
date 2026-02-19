'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { ExampleVerdictBlock } from '@/src/components/landing/ExampleVerdictBlock';
import { landingEase, landingMotion, sectionRevealVariants, staggerGroup, staggerItem } from '@/features/landing/motionTokens';

export function StaticVerdictDemo() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      variants={sectionRevealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      className="terminal-panel space-y-3 rounded-xl p-5"
    >
      <motion.div variants={staggerItem}>
        <p className="text-xs uppercase tracking-wide text-cyan-300">Output stream</p>
        <h2 className="mt-1 text-lg font-semibold">Operational verdict, instantly readable</h2>
      </motion.div>

      <motion.div variants={staggerGroup} className="rounded border border-slate-800 bg-slate-950/60 p-4">
        <motion.p variants={staggerItem} className="text-xs uppercase tracking-wide text-slate-400">
          Example ticket
        </motion.p>
        <motion.p variants={staggerItem} className="mt-1 text-sm text-slate-200">
          Luka 30+ pts · LeBron 6+ ast · KAT 2+ threes
        </motion.p>
        <motion.div variants={staggerGroup} className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <motion.span variants={staggerItem} className="rounded-full border border-amber-400/50 bg-amber-400/15 px-2 py-1 text-amber-200">
            MODIFY
          </motion.span>
          <motion.span
            variants={staggerItem}
            className="rounded-full border border-rose-400/40 bg-rose-400/10 px-2 py-1 text-rose-200"
            initial={shouldReduceMotion ? false : { backgroundColor: 'rgba(251,113,133,0.05)' }}
            whileInView={shouldReduceMotion ? undefined : { backgroundColor: 'rgba(251,113,133,0.18)' }}
            viewport={{ once: true }}
            transition={{ duration: landingMotion.fast, ease: landingEase }}
          >
            Weakest leg: KAT 2+ threes
          </motion.span>
          <motion.span
            variants={staggerItem}
            className="confidence-badge rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-cyan-200"
          >
            Confidence: 64%
          </motion.span>
          <motion.span
            variants={staggerItem}
            className="risk-label rounded-full border border-slate-600 px-2 py-1 text-slate-300"
            initial={shouldReduceMotion ? false : { borderColor: 'rgba(71, 85, 105, 0.65)', color: 'rgb(148 163 184)' }}
            whileInView={
              shouldReduceMotion
                ? undefined
                : { borderColor: 'rgba(251, 191, 36, 0.55)', color: 'rgb(253 230 138)', backgroundColor: 'rgba(251,191,36,0.08)' }
            }
            viewport={{ once: true }}
            transition={{ duration: landingMotion.base, ease: landingEase }}
          >
            Risk: Medium
          </motion.span>
        </motion.div>
        <motion.ul variants={staggerGroup} className="mt-3 list-disc pl-4 text-xs text-slate-400">
          <motion.li variants={staggerItem}>Volatility elevated in recent 3PT attempts profile.</motion.li>
          <motion.li variants={staggerItem}>Matchup pace lowers clean shot volume.</motion.li>
          <motion.li variants={staggerItem}>Injury/rotation uncertainty raises variance.</motion.li>
        </motion.ul>
      </motion.div>

      <motion.div variants={staggerItem}>
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Example Verdict</p>
        <ExampleVerdictBlock />
      </motion.div>
    </motion.section>
  );
}
