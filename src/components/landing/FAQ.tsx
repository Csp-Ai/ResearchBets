import styles from './landing.module.css';

export function FAQ() {
  return <section className={styles.faqSection} id="faq"><div className={styles.faqInner}><div className={styles.sectionLabel}>Common questions</div><h2>Let&apos;s clear it up.</h2><div className={styles.faqItem}><div className={styles.faqQ}>&quot;Is this just another pick site?&quot;</div><div className={styles.faqA}>No picks. No locks. Just analysis.</div></div></div></section>;
}
