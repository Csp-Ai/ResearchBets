import styles from './landing.module.css';

export function NotSection() {
  return (
    <section className={styles.notSection}>
      <h2>No picks. No locks. No hype.</h2>
      <p>Just repeatable research and transparent mode-aware telemetry.</p>
    </section>
  );
}
