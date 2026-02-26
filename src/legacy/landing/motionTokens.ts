import type { Transition, Variants } from 'framer-motion';

export const landingEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const landingMotion = {
  fast: 0.24,
  base: 0.34,
  slow: 0.58,
  stagger: 0.09
} as const;

export const landingTransition: Transition = {
  duration: landingMotion.base,
  ease: landingEase
};

export const sectionRevealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: landingMotion.base,
      ease: landingEase
    }
  }
};

export const staggerGroup: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: landingMotion.stagger,
      delayChildren: 0.05
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: landingMotion.fast,
      ease: landingEase
    }
  }
};
