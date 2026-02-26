'use client';

import Link from 'next/link';

import type { LandingMode } from './mode';
import { LiveSnapshot } from './LiveSnapshot';
import { StatsBar } from './StatsBar';
import styles from './landing.module.css';

export function Hero({
  mode,
  modeReason,
  today,
  loading,
  onRunFromSnapshot,
  freshnessMinutes
}: {
  mode: LandingMode;
  modeReason?: string;
  today: {
    mode: 'live' | 'demo';
    reason: string;
    gamesCount: number;
    headlineMatchup?: string;
    lastUpdatedAt: string;
  } | null;
  loading: boolean;
  onRunFromSnapshot: () => void;
  freshnessMinutes: number;
}) {
  const effectiveMode = today?.mode ?? (mode === 'live' ? 'live' : 'demo');

  return (
    <section className={styles.hero} id="hero">
      <div className={styles.heroGrid} />
      <div className={styles.heroGlow} />
      <div className={styles.heroShell}>
        <div className={styles.heroCopy}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />Research workflow for bettors
          </div>
          <div className={`${styles.modeChip} ${effectiveMode === 'live' ? styles.live : styles.demo}`}>
            {effectiveMode === 'live' ? 'Live telemetry' : 'Demo telemetry'}
            {modeReason ? <span className={styles.modeChipReason}>· {modeReason}</span> : null}
          </div>
          <h1>Find the leg that breaks your parlay.</h1>
          <p className={styles.heroSub}>
            Before: decide with weakest-leg risk. During: track line movement and game state. After:
            learn what broke and improve.
          </p>
          <div className={styles.heroCtas}>
            <div className={styles.heroCtasRow}>
              <Link href="/ingest" className={styles.btnPrimary}>
                Analyze my slip
              </Link>
              <Link href="/stress-test?demo=1" className={styles.btnSecondary}>
                Run demo
              </Link>
            </div>
            <p className={styles.heroMicro}>Anonymous-first. Truthful live/demo labels on every proof card.</p>
          </div>
        </div>
        <div className={styles.heroProofColumn}>
          <LiveSnapshot mode={mode} onRun={onRunFromSnapshot} snapshot={today} loading={loading} compact />
          <StatsBar
            compact
            variant="landing"
            stats={{ slips: 0, riskRate: 0, accuracy: 0, correlationWarnings: 0 }}
            mode={effectiveMode}
            freshnessMinutes={freshnessMinutes}
            reason={modeReason}
          />
        </div>
      </div>
    </section>
  );
}
