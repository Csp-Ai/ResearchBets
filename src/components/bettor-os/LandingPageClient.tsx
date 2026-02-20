'use client';

import { motion, useReducedMotion } from 'framer-motion';

const heroContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const heroItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
};

export default function LandingPageClient() {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : heroContainer;

  const itemVariants = prefersReducedMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : heroItem;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <motion.section initial="hidden" animate="visible" variants={containerVariants} className="space-y-4">
        <motion.h1 variants={itemVariants} className="text-4xl font-semibold tracking-tight text-slate-100">
          Everyday Bettor OS
        </motion.h1>
        <motion.p variants={itemVariants} className="max-w-2xl text-slate-300">
          Decision-first workflows with confidence, context, and disciplined execution.
        </motion.p>
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-3">
          <motion.button
            type="button"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300 }}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-slate-950"
          >
            Analyze Slip
          </motion.button>
          <motion.a
            href="/research"
            variants={itemVariants}
            className="rounded-lg border border-slate-500 px-5 py-2.5 font-medium text-slate-100"
          >
            Open Hub
          </motion.a>
        </motion.div>
      </motion.section>
    </main>
  );
}
