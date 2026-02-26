'use client';
import { useEffect, useRef, useState } from 'react';
import { ODDS_DATA } from './landingData';
import styles from './landing.module.css';

type Tab = keyof typeof ODDS_DATA;

export function OddsMovement() {
  const [tab, setTab] = useState<Tab>('ML');
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.parentElement?.clientWidth ?? 1000;
    const height = 160;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio; canvas.height = height * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const points = Array.from({ length: 50 }, (_, i) => 90 + Math.sin(i / 5 + tab.length) * 15 + Math.random() * 8);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    for (let y = 0; y < 4; y++) { const yy = (y / 3) * height; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(width, yy); ctx.stroke(); }
    ctx.beginPath(); ctx.strokeStyle = '#00e5c8'; ctx.lineWidth = 2;
    points.forEach((v, i) => { const x = (i / (points.length - 1)) * width; const y = height - v; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
  }, [tab]);
  return <section className={styles.oddsSection}><div className={styles.oddsInner}><div className={styles.oddsHeader}><div><div className={styles.sectionLabel}>Live odds traces</div><h2>Lines move.<br />We watch them.</h2></div><div className={styles.oddsTabs} role="tablist">{(['ML', 'PTS', 'AST'] as Tab[]).map((name) => <button type="button" key={name} role="tab" aria-selected={tab === name} className={`${styles.oddsTab} ${tab === name ? styles.active : ''}`} onClick={() => setTab(name)}>{name === 'ML' ? 'Knicks ML' : name === 'PTS' ? 'Brunson PTS' : 'Haliburton AST'}</button>)}</div></div><div className={styles.oddsChartWrap}><canvas ref={ref} /></div><div className={styles.oddsAnnotations}><div className={styles.oddsAnn}><span className={styles.annDot} style={{ background: '#00e5c8' }} />Current line</div><div className={styles.oddsAnn}><span className={styles.annDot} style={{ background: '#f5c542' }} />Sharp money move</div><div className={styles.oddsAnn}><span className={styles.annDot} style={{ background: '#ff4f5e' }} />Injury flag</div></div></div></section>;
}
