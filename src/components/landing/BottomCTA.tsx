import Link from 'next/link';

import type { LandingPhase } from './LifecycleTabs';
import { appendQuery } from './navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import styles from './landing.module.css';

const phaseSecondary: Record<LandingPhase, { label: string; path: string; query?: Record<string, string>; forceDemo?: boolean }> = {
  before: { label: 'Run demo', path: '/stress-test', forceDemo: true },
  during: { label: 'Open live view', path: '/control', query: { tab: 'live' } },
  after: { label: 'Review results', path: '/control', query: { tab: 'review' } }
};

const phaseCopy: Record<LandingPhase, string> = {
  before: 'Before lock: analyze weakest-leg risk and decide with context.',
  during: 'During games: monitor line movement and live status in one place.',
  after: 'After results: review misses and calibrate your next slip.'
};

export function BottomCTA({
  stickyVisible,
  mode,
  reason,
  activePhase
}: {
  stickyVisible: boolean;
  mode: 'live' | 'demo';
  reason?: string;
  activePhase: LandingPhase;
}) {
  const nervous = useNervousSystem();
  const secondary = phaseSecondary[activePhase];
  const baseSecondaryHref = secondary.forceDemo
    ? nervous.toHref(secondary.path, { mode: 'demo' })
    : nervous.toHref(secondary.path);
  const secondaryHref = appendQuery(baseSecondaryHref, secondary.query ?? {});

  return (
    <>
      <div className={`${styles.stickyBar} ${stickyVisible ? styles.stickyVisible : ''}`}>
        <div className={styles.stickyMode}>
          {mode === 'live' ? 'Live telemetry' : 'Demo telemetry'}
          {reason ? <span className={styles.stickyReason}>· {reason}</span> : null}
        </div>
        <div className={styles.stickyActions}>
          <Link href={nervous.toHref('/ingest')} className={styles.btnPrimary}>
            Analyze slip
          </Link>
          <Link href={secondaryHref} className={styles.btnSecondary}>
            {secondary.label}
          </Link>
        </div>
      </div>
      <section className={styles.bottomCta}>
        <div className={styles.bottomGlow} />
        <h2>Ready for the next decision?</h2>
        <p>{phaseCopy[activePhase]}</p>
        <div className={styles.bottomCtas}>
          <Link href={nervous.toHref('/ingest')} className={styles.btnPrimary}>
            Analyze my slip
          </Link>
          <Link href={secondaryHref} className={styles.btnSecondary}>
            {secondary.label}
          </Link>
        </div>
      </section>
    </>
  );
}
