'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import styles from './landing.module.css';

function scaleCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [legs, setLegs] = useState(4);
  const [returnLine, setReturnLine] = useState('');

  useEffect(() => {
    const lastLegs = window.localStorage.getItem('rb_last_legs');
    const lastVisit = window.localStorage.getItem('rb_last_visit');
    if (lastLegs && lastVisit) {
      const ago = Math.floor((Date.now() - Number.parseInt(lastVisit, 10)) / 60000);
      const agoText = ago < 60 ? `${ago}m ago` : `${Math.floor(ago / 60)}h ago`;
      setReturnLine(`↩ Your last slip had ${lastLegs} legs · ${agoText} — stress test again?`);
    }
    window.localStorage.setItem('rb_last_visit', String(Date.now()));
    window.localStorage.setItem('rb_last_legs', String(legs));
  }, [legs]);

  const sim = useMemo(() => {
    const legProb = 0.58;
    const hitProb = Math.pow(legProb, legs);
    const pct = Math.round(hitProb * 100);
    const ev = ((hitProb * (Math.pow(1.9, legs) - 1) - (1 - hitProb)) * 100).toFixed(0);
    return { pct, ev, tier: pct > 25 ? 'LOW' : pct > 12 ? 'MED' : 'HIGH' };
  }, [legs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = () => {
      const width = canvas.parentElement?.clientWidth ?? 600;
      const height = 72;
      scaleCanvas(canvas, ctx, width, height);
      const N = 100;
      const vals = Array.from({ length: N }, (_, i) => 0.3 + Math.sin(i / 8 + legs) * 0.2 + Math.random() * 0.1);
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let y = 0; y <= height; y += height / 3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(0,229,200,0.18)');
      grad.addColorStop(1, 'rgba(0,229,200,0)');
      ctx.beginPath();
      ctx.moveTo(0, height);
      vals.forEach((v, i) => ctx.lineTo((i / (N - 1)) * width, height - v * (height - 8)));
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = '#00e5c8';
      ctx.lineWidth = 1.5;
      vals.forEach((v, i) => (i === 0 ? ctx.moveTo(0, height - v * (height - 8)) : ctx.lineTo((i / (N - 1)) * width, height - v * (height - 8))));
      ctx.stroke();
    };
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [legs]);

  return (
    <section className={styles.hero}>
      <div className={styles.heroGrid} />
      <div className={styles.heroGlow} />
      <div className={styles.badge}><span className={styles.badgeDot} />Betting OS. Build. Check. Improve.</div>
      {returnLine ? <div className={`${styles.heroReturn} ${styles.visible}`}>{returnLine}</div> : null}
      <h1>Before.<br /><em>During.</em><br />After.</h1>
      <p className={styles.heroSub}>Get AI-backed prop ideas. Stress test your slip before you lock it. Learn what&apos;s costing you money.</p>
      <div className={styles.heroCtas}>
        <div className={styles.heroCtasRow}>
          <Link href="/ingest" className={styles.btnPrimary}>Stress test a slip →</Link>
          <Link href="/stress-test?demo=1" className={styles.btnSecondary}>Browse prop ideas</Link>
        </div>
        <Link href="/ingest?mode=screenshot" className={styles.btnGhost}>Upload a screenshot instead</Link>
      </div>
      <div className={styles.heroSim}>
        <div className={styles.heroSimLabel}>Live simulation — drag to adjust leg count <span>~{sim.pct}% hit rate</span></div>
        <div className={styles.simSliderRow}>
          <input className={styles.simSlider} type="range" min={2} max={8} value={legs} onChange={(e) => setLegs(Number(e.target.value))} />
          <span className={styles.simSliderVal}>{legs}</span>
        </div>
        <div className={styles.simCanvasWrap}><canvas ref={canvasRef} /></div>
        <div className={styles.simVerdict}><span>Hit rate: <span className={styles.svHit}>{sim.pct}%</span></span><span>Expected value: <span className={styles.svRisk}>{sim.ev}%</span></span><span>Risk tier: <span className={styles.svRisk}>{sim.tier} RISK</span></span></div>
      </div>
      <div className={styles.scrollHint}>scroll</div>
    </section>
  );
}
