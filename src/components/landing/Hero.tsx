'use client';

import Link from 'next/link';

import type { LandingMode } from './mode';
import { LiveSnapshot } from './LiveSnapshot';
import { ModeBadge } from './ModeBadge';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { StatsBar } from './StatsBar';
import styles from './landing.module.css';

export function Hero({
  mode,
  modeReason,
  today,
  loading,
  onRunFromSnapshot,
  freshnessMinutes,
  providerHealth
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
  providerHealth: { ok: boolean; mode: 'live' | 'demo' | 'cache'; reason?: string; providerErrors?: string[] } | null;
}) {
  const nervous = useNervousSystem();
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
          <ModeBadge requestedMode={mode} effectiveMode={effectiveMode} reason={modeReason} />
          <h1>Find the leg that breaks your parlay.</h1>
          <p className={styles.heroSub}>
            Before: decide with weakest-leg risk. During: track line movement and game state. After:
            learn what broke and improve.
          </p>
          <div className={styles.heroCtas}>
            <div className={styles.heroCtasRow}>
              <Link href={nervous.toHref('/ingest')} className={styles.btnPrimary}>
                Analyze my slip
              </Link>
              <Link href={nervous.toHref('/stress-test', { tab: 'analyze' })} className={styles.btnSecondary}>
                Run demo
              </Link>
            </div>
            <p className={styles.heroMicro}>Anonymous-first. Truthful live/demo labels on every proof card.</p>
          </div>
        </div>
        <div className={styles.heroProofColumn}>
          <LiveSnapshot mode={mode} onRun={onRunFromSnapshot} snapshot={today} loading={loading} compact providerHealth={providerHealth} />
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
