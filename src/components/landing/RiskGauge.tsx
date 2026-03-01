'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { GAUGE_LEGS } from './landingData';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import styles from './landing.module.css';

export function RiskGauge() {
  const nervous = useNervousSystem();
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [pct, setPct] = useState(62);
  const [tip, setTip] = useState('Hover a leg for AI context.');
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const W = 220; const H = 120;
    canvas.width = W * ratio; canvas.height = H * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath(); ctx.arc(W / 2, H - 10, 90, Math.PI, 2 * Math.PI); ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.stroke();
    const col = pct < 35 ? '#00e5c8' : pct < 60 ? '#f5c542' : '#ff4f5e';
    ctx.beginPath(); ctx.arc(W / 2, H - 10, 90, Math.PI, Math.PI + (pct / 100) * Math.PI); ctx.lineWidth = 12; ctx.strokeStyle = col; ctx.stroke();
  }, [pct]);

  return <section className={styles.gaugeSection}><div className={styles.gaugeInner}><div className={styles.gaugeCopy}><div className={styles.sectionLabel}>Risk intelligence</div><h2>Your slip risk,<br />leg by leg.</h2><p className={styles.sectionCaption}>Identify which leg contributes most downside before you submit.</p><Link href={nervous.toHref('/ingest')} className={styles.btnPrimary}>Analyze my slip</Link></div><div className={styles.gaugeWidget}><div className={styles.gaugeTitle}>Slip risk breakdown</div><div className={styles.gaugeArcWrap}><canvas ref={ref} /><div className={styles.gaugePct}>{pct}%</div></div><div className={styles.gaugeLegs}>{GAUGE_LEGS.map((leg) => <div key={leg.name} className={styles.gaugeLegRow} onMouseEnter={() => { setPct(leg.risk); setTip(`<span class="hl">${leg.name}</span> — ${leg.tip}`); }} onMouseLeave={() => { setPct(62); setTip('Hover a leg for AI context.'); }}><span className={styles.gaugeLegDot} style={{ background: leg.color }} /><span className={styles.gaugeLegName}>{leg.name}</span><span className={styles.gaugeLegBarWrap}><span className={styles.gaugeLegBar} style={{ width: `${leg.risk}%`, background: leg.color }} /></span><span className={styles.gaugeLegRisk}>{leg.risk}%</span></div>)}</div><div className={styles.gaugeTooltip} dangerouslySetInnerHTML={{ __html: tip }} /></div></div></section>;
}
