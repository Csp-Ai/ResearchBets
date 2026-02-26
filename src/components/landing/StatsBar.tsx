'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './landing.module.css';

const targets = [14, 73, 81, 38];
const suffixes = ['k+', '%', '%', 'k+'];
const labels = ['Slips analyzed', 'Avg risk flag rate', 'Weakest leg accuracy', 'Correlation warnings'];
const fills = [78, 73, 81, 63];

export function StatsBar() {
  const [vals, setVals] = useState([0, 0, 0, 0]);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setStarted(true);
    }, { threshold: 0.3 });
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      setVals(targets.map((t) => Math.min(t, Math.floor((t * frame) / 40))));
      if (frame >= 40) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [started]);
  return <div ref={ref} className={styles.statsBar}>{vals.map((value, idx) => <div key={labels[idx]} className={styles.statCell}><div className={styles.statVal}><span>{value}</span>{suffixes[idx]}</div><div className={styles.statLabel}>{labels[idx]}</div><div className={styles.statBarFill} style={{ width: started ? `${fills[idx]}%` : '0%' }} /></div>)}</div>;
}
