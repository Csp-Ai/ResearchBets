'use client';
import type { LandingMode } from './mode';

import styles from './landing.module.css';

const reasonText: Record<string, string> = {
  demo_requested: 'Demo requested via query parameter.',
  live_mode_disabled: 'LIVE_MODE is disabled in this environment.',
  missing_provider_keys: 'Provider keys are missing. Using deterministic demo telemetry.',
  provider_error: 'Provider fetch failed. Falling back to deterministic demo telemetry.',
  unknown: 'Telemetry status is currently unavailable.'
};

export function LiveSnapshot({
  mode,
  onRun,
  snapshot,
  loading
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
}) {
  const effectiveMode = snapshot?.mode ?? (mode === 'live' ? 'live' : 'demo');
  const label = effectiveMode === 'live' ? 'Live telemetry' : 'Demo telemetry';
  return <section className={styles.snapshotSection}><div className={styles.snapshotInner}><div className={`${styles.snapshotToast} ${effectiveMode === 'live' ? styles.live : ''}`}><span className={styles.toastDot} />{loading ? 'Loading telemetry snapshot…' : `${label} · ${snapshot?.gamesCount ?? 0} games tracked`}</div><div className={styles.snapshotCard}><div className={styles.snapshotHeader}><span className={styles.stitle}>Live Snapshot</span><span className={`${styles.modeBadge} ${effectiveMode === 'live' ? styles.live : styles.demo}`}>{label}</span></div><div className={styles.snapshotBody}><div className={styles.snapshotAsOf}>As of {snapshot?.lastUpdatedAt ? new Date(snapshot.lastUpdatedAt).toTimeString().slice(0, 8) : '—'}</div><div className={styles.providerChips}>{loading ? <span className={styles.skeleton} style={{ width: 160, height: 22 }} /> : <span className={`${styles.providerChip} ${effectiveMode === 'live' ? styles.ok : styles.warn}`}>{effectiveMode === 'live' ? '✅' : '⚠️'} {reasonText[snapshot?.reason ?? 'unknown'] ?? reasonText.unknown}</span>}</div><div className={styles.snapshotDivider} /><div className={styles.snapshotRow}><span className={styles.gameName}>{snapshot?.headlineMatchup ?? '—'} <span className={styles.gameLeague}>Today</span></span><span className={styles.gameTime}>{snapshot ? `${snapshot.gamesCount} games` : ''}</span></div><div className={styles.snapshotRow}><span className={styles.oddsLabel}>Mode reason</span><span className={styles.oddsValue}>{reasonText[snapshot?.reason ?? 'unknown'] ?? reasonText.unknown}</span></div></div><div className={styles.snapshotFooter}><button type="button" className={styles.snapshotCta} onClick={onRun}><span>Run pipeline on this game</span><span>→</span></button></div></div></div></section>;
}
