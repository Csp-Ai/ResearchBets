import Link from 'next/link';

import { appendQuery } from './navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import styles from './landing.module.css';

export function BottomCTA({
  stickyVisible,
  mode,
  reason
}: {
  stickyVisible: boolean;
  mode: 'live' | 'demo';
  reason?: string;
}) {
  const nervous = useNervousSystem();
  const buildHref = appendQuery(nervous.toHref('/slip'), { from: 'sticky' });

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
          <Link href={buildHref} className={styles.btnSecondary}>
            Build slip
          </Link>
        </div>
      </div>
      <section className={styles.bottomCta}>
        <div className={styles.bottomGlow} />
        <h2>Ready for the next decision?</h2>
        <p>From board signal to postmortem notes, keep one spine and decide faster.</p>
        <div className={styles.bottomCtas}>
          <Link href={nervous.toHref('/ingest')} className={styles.btnPrimary}>
            Analyze my slip
          </Link>
          <Link href={appendQuery(nervous.toHref('/stress-test'), { tab: 'scout' })} className={styles.btnSecondary}>
            Open Scout
          </Link>
        </div>
      </section>
    </>
  );
}
