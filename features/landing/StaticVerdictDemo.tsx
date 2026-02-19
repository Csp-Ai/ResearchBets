'use client';

import { motion, useReducedMotion } from 'framer-motion';

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
        <p className="text-xs uppercase tracking-wide text-cyan-300">Example trace output</p>
        <h2 className="mt-1 text-lg font-semibold">Know what&apos;s missing before you place.</h2>
      </motion.div>

      <motion.div variants={staggerGroup} className="rounded border border-slate-800 bg-slate-950/60 p-4">
        <motion.p variants={staggerItem} className="text-xs uppercase tracking-wide text-slate-400">
          Example slip
        </motion.p>
        <motion.p variants={staggerItem} className="mt-1 text-sm text-slate-200">
          Luka — Points · LeBron — Assists · KAT — 3PT makes
        </motion.p>
        <motion.div variants={staggerGroup} className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <motion.span variants={staggerItem} className="rounded-full border border-amber-400/50 bg-amber-400/15 px-2 py-1 text-amber-200">
            Flagged: 1 fragile leg
          </motion.span>
          <motion.span
            variants={staggerItem}
            className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-cyan-200"
          >
            Evidence: 6/8 checks
          </motion.span>
          <motion.span
            variants={staggerItem}
            className="meta-badge rounded-full border border-slate-600 px-2 py-1 text-slate-300"
            initial={shouldReduceMotion ? false : { borderColor: 'rgba(71, 85, 105, 0.65)', color: 'rgb(148 163 184)' }}
            whileInView={
              shouldReduceMotion
                ? undefined
                : { borderColor: 'rgba(251, 191, 36, 0.55)', color: 'rgb(253 230 138)', backgroundColor: 'rgba(251,191,36,0.08)' }
            }
            viewport={{ once: true }}
            transition={{ duration: landingMotion.base, ease: landingEase }}
          >
            Warnings: 2
          </motion.span>
          <motion.span variants={staggerItem} className="rounded-full border border-rose-400/40 bg-rose-400/10 px-2 py-1 text-rose-200">
            Fragility driver: 3PT makes (high variance)
          </motion.span>
        </motion.div>
        <motion.ul variants={staggerGroup} className="mt-3 list-disc pl-4 text-xs text-slate-400">
          <motion.li variants={staggerItem}>Assumption: volume holds (minutes + attempts).</motion.li>
          <motion.li variants={staggerItem}>Check pending: pace/context.</motion.li>
          <motion.li variants={staggerItem}>Check pending: availability/rotation.</motion.li>
        </motion.ul>
      </motion.div>

      <motion.div variants={staggerItem} className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-xs uppercase tracking-wide text-cyan-300">Trace summary</p>
        <h3 className="mt-2 text-sm font-semibold text-slate-100">What was checked</h3>
        <p className="mt-1 text-xs text-slate-300">Leg mapping, line format, and baseline context were captured with timestamps.</p>
        <h3 className="mt-3 text-sm font-semibold text-slate-100">What&apos;s missing</h3>
        <p className="mt-1 text-xs text-slate-300">Two checks are pending on pace/context and latest rotation news.</p>
        <h3 className="mt-3 text-sm font-semibold text-slate-100">What&apos;s fragile (and why)</h3>
        <p className="mt-1 text-xs text-slate-300">3PT makes remain sensitive to shot-mix swings, so this leg is marked for review.</p>
      </motion.div>
    </motion.section>
  );
}
