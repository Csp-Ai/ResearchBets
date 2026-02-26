import styles from './landing.module.css';

export function Footer() {
  return <footer className={styles.footer}><div className={styles.footerLogo}>ResearchBets</div><div className={styles.footerNote}>Built for bettors who think. Not affiliated with any sportsbook.</div></footer>;
}
