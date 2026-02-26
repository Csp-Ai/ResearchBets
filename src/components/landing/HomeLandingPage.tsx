'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  useCallback,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref
} from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { appendQuery } from '@/src/components/landing/navigation';

type TrackerHandle = { run: (source?: string) => void };
const CYAN = '#00e5c8';
const YELLOW = '#f5c542';
const RED = '#ff4f5e';

const proofChips = ['Works with FanDuel', 'PrizePicks', 'Kalshi', 'Anonymous-first', 'Demo mode always available', 'No picks. No locks.'];

const faq = [
  ['"Is this just another pick site?"', 'No picks. No locks. No influencers.<br><span class="text-[#00e5c8]">Just analysis.</span> You bring the slip. We show you what\'s risky.'],
  ['"Is this complicated to use?"', 'Paste. See verdict.<br>Browse. Add leg.<br><span class="text-[#00e5c8]">That\'s it.</span>'],
  ['"Does it work with my sportsbook?"', '<span class="text-[#00e5c8]">Yes.</span> FanDuel, PrizePicks, Kalshi, and more. Paste your legs or upload a screenshot.'],
  ['"Will it tell me what to bet?"', 'No. It shows risk and context.<br><span class="text-[#00e5c8]">You decide.</span> We make sure you\'re not walking in blind.'],
  ['"Do I need an account?"', 'No account for demo mode.<br><span class="text-[#00e5c8]">Sign in to save</span> history and postmortems.']
] as const;

const legs = [
  { name: 'Brunson 27+ PTS', risk: 22, color: CYAN, tip: 'Solid matchup. Home, rested, last 5 avg 29.2. Low risk.' },
  { name: 'Knicks ML', risk: 31, color: YELLOW, tip: 'Overlaps with Brunson PTS. Correlated — both win or both lose. Counts once.' },
  { name: 'Haliburton 8+ AST', risk: 48, color: YELLOW, tip: 'Limited practice today. Status questionable. Injury watch.' },
  { name: 'Tucker 3+ REB', risk: 72, color: RED, tip: 'Weakest leg. Inconsistent minutes. Low floor. Consider cutting.' }
] as const;

const trackerSteps = [
  { label: 'Parse slip', detail: '4 legs detected. Mapping player IDs to database.' },
  { label: 'Check injuries', detail: 'Haliburton: limited practice. Tucker: full.' },
  { label: 'Watch line movement', detail: 'Brunson 27+ moved from -110 to -115. Monitor.' },
  { label: 'Detect overlap', detail: 'Brunson PTS + Knicks ML flagged as correlated legs.' },
  { label: 'Generate verdict', detail: 'Risk 62%. Weakest leg: Tucker REB. Recommend cut.' }
];

const fmtAgo = (mins: number) => (mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`);

export function HomeLandingPage() {
  const nervous = useNervousSystem();
  const search = useSearchParams();
  const live = search.get('live') === '1';
  const trackerRef = useRef<TrackerHandle>(null);

  return (
    <div className="bg-[#09090c] text-[#dde4ec]">
      <NavBar nervous={nervous} />
      <Hero nervous={nervous} />
      <ProofStrip />
      <StatsBar />
      <LiveSnapshot
        live={live}
        onRun={() => {
          document.getElementById('tracker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => trackerRef.current?.run('Featured Game'), 400);
        }}
      />
      <RiskGauge nervous={nervous} />
      <OddsMovement />
      <LandingTracker ref={trackerRef} live={live} />
      <Pillars nervous={nervous} />
      <VerdictMock nervous={nervous} />
      <NotSection />
      <FaqSection />
      <BottomCta nervous={nervous} />
      <footer className="border-t border-white/10 px-6 py-10 text-center text-xs text-slate-500">Built for bettors who think. Not affiliated with any sportsbook.</footer>
    </div>
  );
}

function NavBar({ nervous }: { nervous: ReturnType<typeof useNervousSystem> }) {
  return <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#09090c]/90 px-6 py-3 backdrop-blur-xl md:px-10">
    <div className="text-2xl font-black uppercase tracking-wide">Research<span className="text-[#00e5c8]">Bets</span></div>
    <ul className="hidden gap-7 text-xs text-slate-400 md:flex">
      <li><a href="#how-it-works">How it works</a></li>
      <li><a href="#tracker">Stress test</a></li>
      <li><a href="#faq">FAQ</a></li>
    </ul>
    <Link href={nervous.toHref('/ingest')} className="bg-[#00e5c8] px-4 py-2 font-mono text-xs text-black">Stress test a slip →</Link>
  </nav>;
}

function Hero({ nervous }: { nervous: ReturnType<typeof useNervousSystem> }) {
  const [ret, setRet] = useState('');
  const [legsCount, setLegsCount] = useState(4);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const lastLegs = window.localStorage.getItem('rb_last_legs') ?? '4';
    const lastVisit = window.localStorage.getItem('rb_last_visit');
    if (lastVisit) setRet(`↩ Your last slip had ${lastLegs} legs · ${fmtAgo(Math.floor((Date.now() - Number(lastVisit)) / 60000))} — stress test again?`);
    window.localStorage.setItem('rb_last_visit', String(Date.now()));
    window.localStorage.setItem('rb_last_legs', '4');
  }, []);

  const sim = useMemo(() => {
    const hitProb = Math.pow(0.58, legsCount);
    const pct = Math.round(hitProb * 100);
    const ev = Math.round((hitProb * (Math.pow(1.9, legsCount) - 1) - (1 - hitProb)) * 100);
    return { pct, ev, tier: pct > 25 ? 'LOW RISK' : pct > 12 ? 'MED RISK' : 'HIGH RISK' };
  }, [legsCount]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const w = cvs.clientWidth || 600;
    const h = 72;
    cvs.width = w * window.devicePixelRatio;
    cvs.height = h * window.devicePixelRatio;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const points = Array.from({ length: 70 }, (_, i) => ({ x: i / 69 * w, y: h - (Math.sin(i / 7 + legsCount) * 0.22 + 0.4) * (h - 8) }));
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let y = 0; y < h; y += h / 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const grad = ctx.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, 'rgba(0,229,200,0.18)'); grad.addColorStop(1, 'rgba(0,229,200,0)');
    ctx.beginPath(); ctx.moveTo(0, h); points.forEach((p) => ctx.lineTo(p.x, p.y)); ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.strokeStyle = CYAN; ctx.lineWidth = 1.4; points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
  }, [legsCount]);

  return <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-28 text-center md:px-10">
    <div className="landing-grid-drift absolute inset-0" />
    <div className="landing-glow-orb absolute h-[300px] w-[700px] rounded-full" />
    <div className="z-10 mb-7 inline-flex items-center gap-2 border border-[#00e5c8]/30 bg-[#00e5c8]/10 px-4 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#00e5c8]"><span className="h-1.5 w-1.5 rounded-full bg-[#00e5c8]" />Betting OS. Build. Check. Improve.</div>
    {ret && <div className="z-10 mb-6 border border-[#00e5c8]/30 bg-[#00e5c8]/10 px-4 py-1 font-mono text-[11px] text-[#00e5c8]">{ret}</div>}
    <h1 className="z-10 mb-4 text-6xl font-black uppercase leading-[0.88] md:text-8xl">Before.<br /><span className="text-[#00e5c8]">During.</span><br />After.</h1>
    <p className="z-10 mb-5 max-w-xl text-slate-400">Get AI-backed prop ideas. Stress test your slip before you lock it. Learn what&apos;s costing you money.</p>
    <div className="z-10 mb-8 space-y-3">
      <div className="flex flex-wrap justify-center gap-3">
        <Link href={nervous.toHref('/ingest')} className="bg-[#00e5c8] px-6 py-3 font-mono text-sm text-black">Stress test a slip →</Link>
        <Link href={appendQuery(nervous.toHref('/research'), { demo: 1 })} className="border border-white/15 px-6 py-3 font-mono text-sm text-slate-400">Browse prop ideas</Link>
      </div>
      <Link href={appendQuery(nervous.toHref('/ingest'), { mode: 'screenshot' })} className="font-mono text-xs text-slate-600 underline">Upload a screenshot instead</Link>
    </div>
    <div className="z-10 w-full max-w-2xl">
      <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500"><span>Live simulation — drag to adjust leg count</span><span className="text-[#00e5c8]">~{sim.pct}% hit rate</span></div>
      <div className="mb-3 flex items-center gap-3"><input value={legsCount} min={2} max={8} onChange={(e) => setLegsCount(Number(e.target.value))} type="range" className="w-full" /><span className="font-mono text-xs text-slate-400">{legsCount}</span></div>
      <canvas ref={canvasRef} className="h-[72px] w-full border border-white/10 bg-black/20" />
      <div className="mt-3 flex justify-between font-mono text-[11px] text-slate-400"><span>Hit rate: <span className="text-[#00e5c8]">{sim.pct}%</span></span><span>Expected value: <span className="text-[#00e5c8]">{sim.ev > 0 ? '+' : ''}{sim.ev}%</span></span><span>Risk tier: <span className="text-[#f5c542]">{sim.tier}</span></span></div>
    </div>
  </section>;
}

function ProofStrip() { return <div className="overflow-hidden border-y border-white/10 py-3 hover:[animation-play-state:paused]"><div className="landing-marquee flex w-max gap-3">{[...proofChips, ...proofChips].map((item, idx) => <div key={`${item}-${idx}`} className="flex items-center gap-2 border border-white/10 bg-[#0b0f15] px-4 py-2 text-xs text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-[#00e5c8]" />{item}</div>)}</div></div>; }

function StatsBar() {
  const [vals, setVals] = useState([0, 0, 0, 0]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      const targets = [14, 73, 81, 38];
      let current = 0;
      const timer = setInterval(() => {
        current += 1;
        setVals(targets.map((t) => Math.min(t, Math.floor((current / 40) * t))));
        if (current >= 40) clearInterval(timer);
      }, 30);
      obs.disconnect();
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className="grid grid-cols-2 border-b border-white/10 md:grid-cols-4">{[
    [`${vals[0]}k+`, 'Slips analyzed', '78%'],
    [`${vals[1]}%`, 'Avg risk flag rate', '73%'],
    [`${vals[2]}%`, 'Weakest leg accuracy', '81%'],
    [`${vals[3]}k+`, 'Correlation warnings', '63%']
  ].map(([val, label, w]) => <div key={label} className="border-r border-white/10 p-5 last:border-r-0"><div className="font-condensed text-4xl font-black">{val}</div><div className="text-xs text-slate-500">{label}</div><div className="mt-2 h-1 bg-white/10"><div className="h-1 bg-[#00e5c8] transition-all duration-700" style={{ width: vals[0] ? w : 0 }} /></div></div>)}</div>;
}

function LiveSnapshot({ live, onRun }: { live: boolean; onRun: () => void }) {
  const [asOf, setAsOf] = useState('As of  --:--:--');
  useEffect(() => {
    const tick = () => setAsOf(`As of  ${new Date().toTimeString().slice(0, 8)}`);
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, []);
  return <section className="px-6 py-16 md:px-10"><div className="mx-auto max-w-4xl">
    <div className={`mb-4 flex items-center gap-2 border px-4 py-2 font-mono text-xs ${live ? 'border-[#00e5c8]/30 text-[#00e5c8]' : 'border-[#f5c542]/30 text-[#f5c542]'}`}><span className="h-2 w-2 rounded-full bg-current" />{live ? 'Live Mode — awaiting provider data' : 'Demo Mode Active — connect providers to enable live snapshot'}</div>
    <div className="border border-white/10 bg-[#0b0f15]"><div className="flex items-center justify-between border-b border-white/10 p-4"><span className="font-mono text-xs uppercase tracking-widest text-slate-500">Live Snapshot</span><span className={`px-2 py-1 font-mono text-xs ${live ? 'bg-[#00e5c8]/20 text-[#00e5c8]' : 'bg-[#f5c542]/20 text-[#f5c542]'}`}>{live ? 'LIVE' : 'DEMO'}</span></div>
      <div className="space-y-3 p-4 text-sm text-slate-400"><div>{asOf}</div><div className="flex gap-2"><span className="border border-white/10 px-2 py-1">{live ? '✅' : '⚠️'} SportsData</span><span className="border border-white/10 px-2 py-1">{live ? '✅' : '⚠️'} Odds</span></div><div className="flex justify-between"><span>NYK @ IND · NBA</span><span>7:30 PM</span></div><div className="flex justify-between"><span>Odds headline</span><span className="text-slate-200">Knicks ML -130</span></div></div>
      <button onClick={onRun} className="flex w-full items-center justify-between border-t border-white/10 px-4 py-3 font-mono text-sm text-[#00e5c8]">Run pipeline on this game →</button></div></div></section>;
}

function RiskGauge({ nervous }: { nervous: ReturnType<typeof useNervousSystem> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const activeLeg = active === null ? null : legs[active];
  const pct = activeLeg?.risk ?? 62;
  useEffect(() => { const c = canvasRef.current; if (!c) return; const x = c.getContext('2d'); if (!x) return; const w = 220; const h = 120; c.width = w * devicePixelRatio; c.height = h * devicePixelRatio; x.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); x.clearRect(0,0,w,h); const cx=w/2, cy=h-10, r=90; x.beginPath(); x.strokeStyle='rgba(255,255,255,.12)'; x.lineWidth=12; x.arc(cx,cy,r,Math.PI,Math.PI*2); x.stroke(); x.beginPath(); x.strokeStyle=pct>60?RED:pct>35?YELLOW:CYAN; x.lineWidth=12; x.arc(cx,cy,r,Math.PI,Math.PI+(pct/100)*Math.PI); x.stroke(); }, [pct]);
  return <section className="border-y border-white/10 bg-[#0c0f14] px-6 py-16 md:px-10"><div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
    <div><div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#00e5c8]">Animated risk. Phase 02.</div><h2 className="mb-4 text-5xl font-black uppercase leading-[0.9]">Your risk.<br />Live. Leg<br />by leg.</h2><p className="mb-5 text-slate-400">Hover each leg to see how it&apos;s affecting total slip risk. The gauge animates in real time as risk shifts — not a static number, a live read.</p><Link href={nervous.toHref('/ingest')} className="inline-block bg-[#00e5c8] px-6 py-3 font-mono text-sm text-black">Stress test your slip →</Link></div>
    <div className="border border-white/10 bg-[#0b0f15] p-4"><div className="mb-2 text-sm">Slip risk breakdown</div><div className="relative mx-auto w-[220px]"><canvas ref={canvasRef} className="h-[120px] w-[220px]"/><div className="absolute inset-0 top-10 text-center text-3xl font-black text-[#f5c542]">{pct}%</div></div><div className="space-y-2">{legs.map((leg, i) => <div key={leg.name} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className="cursor-pointer border border-white/10 p-2 text-sm">{leg.name}</div>)}</div><div className="mt-3 text-xs text-slate-400">{activeLeg ? activeLeg.tip : 'Hover a leg for AI context.'}</div></div></div></section>;
}

function OddsMovement() {
  const [tab, setTab] = useState<'ML' | 'PTS' | 'AST'>('ML');
  const ref = useRef<HTMLCanvasElement>(null);
  const drawn = useRef(false);
  const tabRef = useRef(tab);
  const draw = useCallback((currentTab: 'ML' | 'PTS' | 'AST') => { const c=ref.current; if(!c)return; const ctx=c.getContext('2d'); if(!ctx)return; const w=c.clientWidth||1000,h=160; c.width=w*devicePixelRatio; c.height=h*devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); ctx.clearRect(0,0,w,h); const pts=Array.from({length:48},(_,i)=>({x:(i/47)*w,y:80+Math.sin(i/6 + (currentTab==='ML'?0:currentTab==='PTS'?1.2:2))*24})); ctx.strokeStyle='rgba(255,255,255,.1)'; for(let y=20;y<h;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();} ctx.beginPath(); ctx.strokeStyle=CYAN; ctx.lineWidth=2; pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.stroke(); [{x:.25,c:YELLOW,t:'Sharp money'},{x:.6,c:RED,t:'Injury flag'},{x:.82,c:CYAN,t:'Current'}].forEach((e)=>{const x=w*e.x; const idx=Math.min(pts.length-1, Math.max(0, Math.floor(pts.length*e.x))); const y=pts[idx]?.y ?? h/2; ctx.fillStyle=e.c; ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(203,213,225,.8)'; ctx.font='10px monospace'; ctx.fillText(e.t, x+6, y-8);}); }, []);
  useEffect(() => { tabRef.current = tab; if (drawn.current) draw(tab); }, [tab, draw]);
  /* Keep the observer/resize effect stable so we do not resubscribe on tab flips.
     draw() is stable via useCallback and receives tab explicitly to avoid stale closures.
     If this logic changes, keep listeners in this effect and pass dynamic values as args/refs. */
  useEffect(() => { const obs=new IntersectionObserver(([e])=>{ if(e?.isIntersecting && !drawn.current){drawn.current=true; draw(tabRef.current);}}, {threshold:.2}); if(ref.current) obs.observe(ref.current); const onR=()=>drawn.current&&draw(tabRef.current); window.addEventListener('resize',onR); return ()=>{obs.disconnect();window.removeEventListener('resize',onR);}; }, [draw]);
  return <section className="px-6 py-16 md:px-10"><div className="mx-auto max-w-5xl"><div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#00e5c8]">Live odds traces</div><h2 className="text-5xl font-black uppercase leading-[0.9]">Lines move.<br />We watch them.</h2></div><div className="flex gap-2">{(['ML','PTS','AST'] as const).map((key)=><button key={key} onClick={()=>setTab(key)} className={`border px-3 py-1 text-xs ${tab===key?'border-[#00e5c8] text-[#00e5c8]':'border-white/10 text-slate-400'}`}>{key==='ML'?'Knicks ML':key==='PTS'?'Brunson PTS':'Haliburton AST'}</button>)}</div></div><canvas ref={ref} className="h-40 w-full border border-white/10 bg-[#0b0f15]"/><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400"><span>● Current line</span><span className="text-[#f5c542]">● Sharp money move</span><span className="text-[#ff4f5e]">● Injury flag</span></div></div></section>;
}

const LandingTracker = forwardRef(function LandingTracker({ live }: { live: boolean }, ref: Ref<TrackerHandle>) {
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(-1);
  const [feed, setFeed] = useState<string[]>([]);
  const [source, setSource] = useState('');
  const [trace, setTrace] = useState('trace_id: —');
  const [running, setRunning] = useState(false);
  const runningRef = useRef(running);
  useImperativeHandle(ref, () => ({ run: (s?: string) => { setSource(s ?? ''); setRun((v) => v + 1); } }));
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => {
    if (!run || runningRef.current) return;
    setRunning(true); setActive(-1); setFeed([]); setTrace(`trace_id: trace_${Math.random().toString(36).slice(2, 8)}`);
    const timers = trackerSteps.map((_, i) => setTimeout(() => { setActive(i); setFeed((f) => [`${trackerSteps[i]?.label.toLowerCase().replace(/\s+/g, '.') ?? 'step'}_complete · ${new Date().toTimeString().slice(0, 8)}`, ...f].slice(0, 5)); if (i === trackerSteps.length - 1) setTimeout(() => { setActive(999); setRunning(false); }, 550); }, 400 + i * 800));
    return () => timers.forEach(clearTimeout);
  }, [run]);
  useEffect(() => { const el = document.getElementById('tracker'); if(!el) return; const o = new IntersectionObserver(([e]) => e?.isIntersecting && setRun((v) => v || 1), {threshold:.3}); o.observe(el); return ()=>o.disconnect(); }, []);
  return <section id="tracker" className="border-y border-white/10 bg-[#0c0f14] px-6 py-16 md:px-10"><div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2"><div><div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#00e5c8]">Live run. Phase 02.</div><h2 className="text-5xl font-black uppercase leading-[0.9]">Watch a slip<br />get checked.</h2><p className="mt-4 text-slate-400">Every slip runs a live agent pipeline. Parse. Research. Correlate. Verdict. Hit run to see it happen.</p></div><div className="border border-white/10 bg-[#0b0f15]"><div className="flex items-center justify-between border-b border-white/10 p-3"><div className="text-xs uppercase tracking-widest text-slate-500">Agent run {source ? <span className="ml-2 text-[#00e5c8]">↑ {source}</span> : null}</div><div className="font-mono text-xs text-slate-500">{trace}</div></div><div className="space-y-3 p-3">{trackerSteps.map((s, i)=>{const state = active===999||i<active?'done':i===active?'running':'queued'; return <div key={s.label} className="flex gap-2"><span className={`mt-0.5 text-xs ${state==='done'?'text-[#00e5c8]':state==='running'?'text-[#f5c542]':'text-slate-600'}`}>{state==='done'?'✓':state==='running'?'◌':'○'}</span><div><div className={`text-sm ${state==='queued'?'text-slate-500':state==='running'?'text-[#00e5c8]':'text-slate-200'}`}>{s.label}</div><div className={`text-xs text-slate-500 ${state==='queued'?'hidden':'block'}`}>{s.detail}</div></div></div>;})}</div><div className="max-h-28 overflow-hidden border-t border-white/10 p-3 text-xs text-slate-500">{feed.length?feed.map((f)=><div key={f} className="py-1 text-[#00e5c8]">{f}</div>):'No events yet.'}</div><div className="flex items-center justify-between border-t border-white/10 p-3"><span className={`text-xs ${running?'text-[#00e5c8]':'text-slate-500'}`}>{running?'Running...':'Run complete.'}</span><div className="flex items-center gap-3"><span className="text-lg text-[#f5c542]">{active===999?'62%':''}</span><button onClick={() => setRun((v) => v + 1)} disabled={running} className="border border-[#00e5c8]/30 px-3 py-1 font-mono text-xs text-[#00e5c8]">{running ? '⟳ Running...' : live ? '↺ Run live pipeline' : '▶ Run demo pipeline'}</button></div></div></div></div></section>;
});

function Pillars({ nervous }: { nervous: ReturnType<typeof useNervousSystem> }) { return <section id="how-it-works" className="px-6 py-16 md:px-10"><div className="mx-auto max-w-6xl"><div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#00e5c8]">Three phases</div><h2 className="text-5xl font-black uppercase">One system.</h2><div className="mt-8 grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">{[
  ['Phase 01','💡','Build It','Don\'t stare at a blank slip. AI-researched prop ideas from matchup data, injury reports, and trends. No picks. Just context.',['AI-curated prop highlights','Injury and matchup awareness','Add legs directly to your slip'],appendQuery(nervous.toHref('/research'),{demo:1}),'Browse prop ideas →'],
  ['Phase 02','⚠️','Check It','Stress test your slip before you submit. We flag your weakest leg, catch legs that overlap, and give you a quick verdict.',['Weakest leg detection','Legs that overlap flagged','How swingy it is. Quick verdict.'],nervous.toHref('/ingest'),'Stress test a slip →'],
  ['Phase 03','📉','Learn It','After results come in, run a postmortem. See what happened leg by leg. Find out what you keep losing on and why.',['Leg-by-leg postmortem','What you keep losing on','Full bet history breakdown'],nervous.toHref('/control'),'See what killed it →']
].map(([phase,icon,title,copy,list,href,cta]) => <div key={String(title)} className="bg-[#0b0f15] p-6"><div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">{phase as string}</div><div className="mb-2 text-2xl">{icon as string}</div><h3 className="text-3xl font-black uppercase">{title as string}</h3><p className="mt-2 text-sm text-slate-400">{copy as string}</p><ul className="mt-4 space-y-1 font-mono text-[11px] text-slate-500">{(list as string[]).map((li)=><li key={li}>→ {li}</li>)}</ul><Link href={href as string} className="mt-4 inline-block font-mono text-xs text-[#00e5c8]">{cta as string}</Link></div>)}</div></div></section>; }

function VerdictMock({ nervous }: { nervous: ReturnType<typeof useNervousSystem> }) { return <section className="border-y border-white/10 bg-[#0c0f14] px-6 py-16 md:px-10"><div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2"><div><div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#00e5c8]">Phase 02. Verdict output.</div><h2 className="my-4 text-5xl font-black uppercase leading-[0.9]">Your slip.<br />Our read.</h2><p className="text-slate-400">Not vibes. Not heat checks. A deterministic read on where your slip breaks first — and why.</p><Link href={nervous.toHref('/ingest')} className="mt-5 inline-block bg-[#00e5c8] px-6 py-3 font-mono text-sm text-black">Stress test now →</Link></div><div className="border border-white/10 bg-[#0b0f15] font-mono text-xs"><div className="flex items-center justify-between border-b border-white/10 p-3"><span className="uppercase tracking-widest text-slate-500">SLIP VERDICT</span><span className="bg-[#f5c542]/15 px-2 py-1 text-[#f5c542]">MED RISK</span></div><div className="space-y-2 p-3 text-slate-300"><div>• Jalen Brunson — 27+ PTS (-115)</div><div>• Knicks ML (-130)</div><div>• Tyrese Haliburton — 8+ AST (+105)</div><div>• PJ Tucker — 3+ REB (-140)</div></div><div className="flex items-center justify-between border-t border-white/10 p-3"><div className="max-w-[200px] text-[#f5c542]">Cut leg 4. Drops from +480 but improves hit rate significantly.</div><div className="text-xl text-[#f5c542]">62%</div></div></div></div></section>; }

function NotSection() { return <section className="px-6 py-16 md:px-10"><div className="mx-auto max-w-5xl"><h2 className="text-5xl font-black uppercase leading-[0.9]">No picks.<br />No locks.<br />No hype.</h2><div className="mt-8 grid gap-6 md:grid-cols-2"><div className="border border-red-500/20 p-5"><div className="mb-3 text-xs uppercase tracking-widest text-red-400">What we&apos;re not</div><ul className="space-y-2 text-sm text-slate-400"><li>✕ A pick service</li><li>✕ An influencer tout</li><li>✕ A &quot;LOCK&quot; account</li><li>✕ A sportsbook</li><li>✕ Going to tell you what to bet</li></ul></div><div className="border border-[#00e5c8]/20 p-5"><div className="mb-3 text-xs uppercase tracking-widest text-[#00e5c8]">What we are</div><ul className="space-y-2 text-sm text-slate-400"><li>→ A betting OS</li><li>→ Research and risk analysis</li><li>→ The smart friend in the group chat</li><li>→ Built for bettors who think</li><li>→ You decide. We just check.</li></ul></div></div></div></section>; }

function FaqSection() { return <section id="faq" className="border-t border-white/10 px-6 py-16 md:px-10"><div className="mx-auto max-w-4xl"><div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#00e5c8]">Common questions</div><h2 className="my-3 text-5xl font-black uppercase">Let&apos;s clear it up.</h2><div className="space-y-4">{faq.map(([q,a]) => <div key={q} className="border border-white/10 p-4"><div className="mb-2 text-sm text-slate-100">{q}</div><div className="text-sm text-slate-400" dangerouslySetInnerHTML={{ __html: a }} /></div>)}</div></div></section>; }

function BottomCta({ nervous }: { nervous: ReturnType<typeof useNervousSystem> }) { return <section className="relative overflow-hidden border-t border-white/10 px-6 py-16 text-center md:px-10"><div className="landing-bottom-glow absolute left-1/2 top-8 h-56 w-56 -translate-x-1/2 rounded-full" /><h2 className="relative text-5xl font-black uppercase leading-[0.9]">Run your slip<br />through<br /><span className="text-[#00e5c8]">ResearchBets.</span></h2><p className="relative mt-4 text-slate-400">Takes 30 seconds. Could save you a leg.</p><div className="relative mt-5 flex flex-wrap justify-center gap-3"><Link href={nervous.toHref('/ingest')} className="bg-[#00e5c8] px-6 py-3 font-mono text-sm text-black">Stress test a slip →</Link><Link href={appendQuery(nervous.toHref('/research'), { demo: 1 })} className="border border-white/20 px-6 py-3 font-mono text-sm text-slate-400">Browse prop ideas</Link></div></section>; }
