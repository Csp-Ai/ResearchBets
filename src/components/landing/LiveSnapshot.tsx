'use client';
import { useMemo } from 'react';
import type { LandingMode } from './mode';

import styles from './landing.module.css';

const reasonText: Record<string, string> = {
  demo_requested: 'Demo requested from the interface.',
  live_mode_disabled: 'Live feeds are switched off in this environment.',
  missing_provider_keys: 'Live provider credentials are not configured.',
  provider_error: 'Live provider request failed, so demo data is shown.',
  unknown: 'Telemetry status is currently unavailable.'
};

export const getModeReasonText = (reason?: string) => reasonText[reason ?? 'unknown'] ?? reasonText.unknown;

export function getTelemetryUpdatedLabel(mode: 'live' | 'demo', freshnessMinutes: number) {
  if (mode === 'demo') return 'Demo dataset';
  const freshness = Number.isFinite(freshnessMinutes) ? freshnessMinutes : 0;
  return `Updated ${freshness}m ago`;
}

export function LiveSnapshot({
  mode,
  onRun,
  snapshot,
  loading,
  compact = false
}: {
  mode: LandingMode;
  onRun: () => void;
  snapshot: {
    mode: 'live' | 'demo';
    reason: string;
    gamesCount: number;
    headlineMatchup?: string;
    lastUpdatedAt: string;
  } | null;
  loading: boolean;
  compact?: boolean;
}) {
  const effectiveMode = snapshot?.mode ?? (mode === 'live' ? 'live' : 'demo');
  const isDemo = effectiveMode !== 'live';
  const label = isDemo ? 'Demo mode (live feeds off)' : 'Live telemetry';
  const reason = useMemo(() => getModeReasonText(snapshot?.reason), [snapshot?.reason]);

  const body = (
    <>
      {!compact ? (
        <div className={`${styles.snapshotToast} ${effectiveMode === 'live' ? styles.live : ''}`}>
          <span className={styles.toastDot} />
          {loading ? 'Loading telemetry snapshot…' : `${isDemo ? 'Demo telemetry active' : 'Live telemetry active'} · ${snapshot?.gamesCount ?? 0} games tracked`}
        </div>
      ) : null}
      <div className={styles.snapshotCard}>
        <div className={styles.snapshotHeader}>
          <span className={styles.stitle}>Live Snapshot</span>
          <span className={`${styles.modeBadge} ${effectiveMode === 'live' ? styles.live : styles.demo}`}>{label}</span>
        </div>
        <div className={styles.snapshotBody}>
          <div className={styles.snapshotAsOf}>As of {isDemo ? 'Demo dataset' : snapshot?.lastUpdatedAt ? new Date(snapshot.lastUpdatedAt).toTimeString().slice(0, 8) : '—'}</div>
          <div className={styles.providerChips}>
            {loading ? (
              <span className={styles.skeleton} style={{ width: 160, height: 22 }} />
            ) : (
              <span className={`${styles.providerChip} ${styles.neutral}`}>
                {isDemo ? 'Using demo telemetry' : 'Live feeds connected'}
              </span>
            )}
          </div>
          <div className={styles.snapshotDivider} />
          <div className={styles.snapshotRow}>
            <span className={styles.gameName}>{snapshot?.headlineMatchup ?? '—'} <span className={styles.gameLeague}>Today</span></span>
            <span className={styles.gameTime}>{snapshot ? `${snapshot.gamesCount} games` : ''}</span>
          </div>
          <div className={styles.snapshotRow}>
            <span className={styles.oddsLabel}>Why?</span>
            <span className={styles.oddsValue}>
              {isDemo ? 'Demo mode (live feeds off)' : 'Live mode'}
              <span className={styles.reasonHelp} title={reason}>ⓘ</span>
            </span>
          </div>
        </div>
        <div className={styles.snapshotFooter}>
          <button type="button" className={styles.snapshotCta} onClick={onRun}>
            <span>Run pipeline on this game</span><span>→</span>
          </button>
        </div>
      </div>
    </>
  );

  if (compact) return <div className={styles.snapshotCompact}>{body}</div>;

  return (
    <section className={styles.snapshotSection}>
      <div className={styles.snapshotInner}>{body}</div>
    </section>
  );
}
