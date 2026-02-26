'use client';

import styles from './landing.module.css';

type ModeBadgeProps = {
  requestedMode: 'live' | 'demo';
  effectiveMode: 'live' | 'demo' | 'cache';
  reason?: string;
};

export function ModeBadge({ requestedMode, effectiveMode, reason }: ModeBadgeProps) {
  const fallback = requestedMode === 'live' && effectiveMode !== 'live';
  const label = effectiveMode === 'live' ? 'Live (connected)' : requestedMode === 'live' ? 'Live requested' : 'Demo mode';
  const detail = fallback
    ? `Live requested — fallback applied${reason ? ` (${reason})` : ''}`
    : effectiveMode === 'live'
      ? 'Live (connected)'
      : `Demo mode (live feeds off)${reason ? ` (${reason})` : ''}`;

  return (
    <div className={styles.modeBadgeQuiet} title={detail} aria-label={detail}>
      <span>{label}</span>
      {fallback ? (
        <span className={styles.modeBadgeFallback}>
          <span className={styles.modeBadgeFallbackDot} />
          Fallback
        </span>
      ) : null}
    </div>
  );
}
