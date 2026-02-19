'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { landingEase, landingMotion, sectionRevealVariants, staggerGroup, staggerItem } from '@/features/landing/motionTokens';

const steps = [
  {
    title: 'Add legs',
    body: 'Paste a slip or select props. Edit anything the parser is unsure about.',
    badge: 'Legs extracted'
  },
  {
    title: 'Generate evidence',
    body: 'Run research to produce a trace: checks, timestamps, sources, warnings.',
    badge: 'Evidence + warnings'
  },
  {
    title: 'Review & save',
    body: 'See what’s fragile and why. Save the trace and revisit post-game.',
    badge: 'Trace + reflection'
  }
];

export function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      variants={sectionRevealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      className="terminal-panel rounded-xl p-5"
    >
      <h2 className="text-lg font-semibold">How the research cockpit works</h2>
      <motion.div variants={staggerGroup} className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <motion.article key={step.title} variants={staggerItem} className="lift-card rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-medium text-slate-100">{step.title}</p>
            <p className="mt-2 text-xs text-slate-400">{step.body}</p>
            <motion.span
              className="meta-badge mt-3 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200"
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: landingMotion.fast, delay: index * 0.05, ease: landingEase }}
            >
              {step.badge}
            </motion.span>
          </motion.article>
        ))}
      </motion.div>
    </motion.section>
  );
}
