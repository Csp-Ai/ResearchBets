import styles from './landing.module.css';

const chips = ['Works with FanDuel', 'PrizePicks', 'Kalshi', 'Anonymous-first', 'Demo mode always available', 'No picks. No locks.'];

export function ProofStrip() {
  return <div className={styles.proofStrip}><div className={styles.proofTrack}>{[...chips, ...chips].map((chip, idx) => <div key={`${chip}-${idx}`} className={styles.proofChip}><span className={styles.dot} />{chip}</div>)}</div></div>;
}
