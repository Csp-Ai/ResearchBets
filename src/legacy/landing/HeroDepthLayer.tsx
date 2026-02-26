'use client';

import { useReducedMotion } from 'framer-motion';

export function HeroDepthLayer() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="hero-depth-base absolute inset-0" />
      <div className="hero-depth-headline absolute inset-0" />
      <div className="hero-depth-vignette absolute inset-0" />
      <div className="hero-depth-haze absolute inset-0" />
      <div className="hero-depth-noise absolute inset-0" />
      {!shouldReduceMotion ? <div className="hero-depth-sensor-band absolute inset-0" /> : null}
    </div>
  );
}
