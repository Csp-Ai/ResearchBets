'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './landing.module.css';

const suffixes = ['k+', '%', '%', 'k+'];
const labels = ['Slips analyzed', 'Avg risk flag rate', 'Weakest leg accuracy', 'Correlation warnings'];
const fills = [78, 73, 81, 63];

export function StatsBar({
  stats,
  mode,
  freshnessMinutes
}: {
  stats: { slips: number; riskRate: number; accuracy: number; correlationWarnings: number };
  mode: 'live' | 'demo';
  freshnessMinutes: number;
}) {
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
      const liveTargets = [stats.slips, stats.riskRate, stats.accuracy, stats.correlationWarnings];
      setVals(liveTargets.map((t) => Math.min(t, Math.floor((t * frame) / 40))));
      if (frame >= 40) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [started, stats.accuracy, stats.correlationWarnings, stats.riskRate, stats.slips]);
  return <><div className={styles.sectionLabel}>{mode === 'live' ? 'Live telemetry' : 'Demo telemetry'} · Updated {freshnessMinutes}m ago</div><div ref={ref} className={styles.statsBar}>{vals.map((value, idx) => <div key={labels[idx]} className={styles.statCell}><div className={styles.statVal}><span>{value}</span>{suffixes[idx]}</div><div className={styles.statLabel}>{labels[idx]}</div><div className={styles.statBarFill} style={{ width: started ? `${fills[idx]}%` : '0%' }} /></div>)}</div></>;
}
