'use client';

import { useReducedMotion, type Variants } from 'framer-motion';

export const useMotionVariants = () => {
  const reduce = useReducedMotion();

  const fadeUp: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: 'easeOut' } } };

  const stagger: Variants = reduce
    ? { hidden: {}, show: { transition: { staggerChildren: 0.01 } } }
    : { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.03 } } };

  return { reduce, fadeUp, stagger };
};
