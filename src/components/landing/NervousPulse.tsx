'use client';

import { useEffect, useState } from 'react';

type NervousPulseProps = {
  burstToken: number;
};

const NODES = [
  { x: 8, y: 28 },
  { x: 22, y: 20 },
  { x: 36, y: 32 },
  { x: 48, y: 16 },
  { x: 62, y: 28 },
  { x: 76, y: 18 },
  { x: 90, y: 30 }
];

export function NervousPulse({ burstToken }: NervousPulseProps) {
  const [burst, setBurst] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(query.matches);
    onChange();
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || burstToken <= 0) return;
    setBurst(true);
    const timer = window.setTimeout(() => setBurst(false), 420);
    return () => window.clearTimeout(timer);
  }, [burstToken, reducedMotion]);

  return (
    <div
      className={`nervous-pulse ${burst ? 'burst' : ''} ${reducedMotion ? 'reduced' : ''}`}
      data-testid="nervous-pulse"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      aria-hidden
    >
      <svg viewBox="0 0 100 40" preserveAspectRatio="none">
        {NODES.map((node, idx) => {
          const next = NODES[idx + 1];
          if (!next) return null;
          return <line key={idx} x1={node.x} y1={node.y} x2={next.x} y2={next.y} />;
        })}
        {NODES.map((node, idx) => (
          <circle key={idx} cx={node.x} cy={node.y} r="1.8" />
        ))}
      </svg>
    </div>
  );
}
