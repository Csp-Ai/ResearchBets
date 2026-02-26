<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>ResearchBets — Build with Confidence</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700;900&family=Barlow:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
/* ── Design tokens ─────────────────────────────────────────── */
:root {
  --bg:    #0c0f16;
  --bg2:   #10141e;
  --bg3:   #141824;
  --card:  #131720;
  --border: rgba(255,255,255,.08);
  --bhi:   rgba(255,255,255,.14);
  --cyan:  #00d4b4;
  --cyan-lt: #7cf7e6;
  --cdim:  rgba(0,212,180,.10);
  --cmid:  rgba(0,212,180,.22);
  --green: #22c55e;
  --gdim:  rgba(34,197,94,.10);
  --text:  #f0f4f8;
  --muted: #8899a8;
  --dim:   #3a4a58;
  --yellow:#f5c542;
  --ydim:  rgba(245,197,66,.10);
  --red:   #f87171;
  --rdim:  rgba(248,113,113,.10);

  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:20px;
  --s6:24px; --s7:32px; --s8:40px; --s9:56px;
  --r:14px; --r2:10px; --r3:6px;
  --shadow: 0 2px 16px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.05);
  --shadow-lg: 0 8px 32px rgba(0,0,0,.5);
}

*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
html { scroll-behavior:smooth; }
body {
  background:var(--bg); color:var(--text);
  font-family:'Barlow', sans-serif; font-size:15px; line-height:1.55;
  overflow-x:hidden;
}
a { color:inherit; text-decoration:none; }
ul { list-style:none; }
button { cursor:pointer; font-family:inherit; border:none; background:none; }

/* ── Typography helpers ────────────────────────────────────── */
.condensed { font-family:'Barlow Condensed', sans-serif; }
.mono      { font-family:'DM Mono', monospace; }
.upper     { text-transform:uppercase; }
.cyan      { color:var(--cyan); }
.green     { color:var(--green); }
.yellow    { color:var(--yellow); }
.red       { color:var(--red); }
.muted     { color:var(--muted); }

/* ── Navigation ─────────────────────────────────────────────── */
.nav {
  position:fixed; top:0; left:0; right:0; z-index:400;
  display:flex; justify-content:space-between; align-items:center;
  height:56px; padding:0 var(--s8);
  background:rgba(12,15,22,.97);
  border-bottom:1px solid var(--border);
  backdrop-filter:blur(12px);
}
.logo { font-family:'Barlow Condensed',sans-serif; font-weight:900; font-size:19px; text-transform:uppercase; letter-spacing:.04em; }
.logo span { color:var(--cyan); }
.nav-links { display:flex; gap:var(--s7); }
.nav-links a { font-size:13px; color:var(--muted); transition:color .15s; font-weight:500; }
.nav-links a:hover { color:var(--text); }
.btn-nav { font-family:'DM Mono',monospace; font-size:12px; font-weight:500; background:var(--cyan); color:#000; border-radius:var(--r3); padding:9px 20px; letter-spacing:.02em; transition:background .15s,transform .12s,box-shadow .15s; }
.btn-nav:hover { background:#00edd0; transform:translateY(-1px); box-shadow:0 0 0 3px rgba(0,212,180,.2); }
@media(max-width:768px) { .nav { padding:0 var(--s5); } .nav-links { display:none; } }

/* ── Spine strip ─────────────────────────────────────────────── */
.spine {
  margin-top:56px; background:var(--bg2);
  border-bottom:1px solid var(--border);
  padding:7px var(--s8);
  display:flex; align-items:center; gap:var(--s3);
  font-family:'DM Mono',monospace; font-size:11px; color:var(--muted);
}
.spine .sep { color:var(--dim); }
.mode-chip {
  padding:2px 9px; border-radius:20px; font-size:10px;
  border:1px solid rgba(245,197,66,.3); background:var(--ydim); color:var(--yellow);
}
.mode-chip.live { border-color:var(--cmid); background:var(--cdim); color:var(--cyan); }
@media(max-width:600px) { .spine { padding:7px var(--s5); overflow-x:auto; white-space:nowrap; } }

/* ── Layout helpers ──────────────────────────────────────────── */
.section { padding:var(--s8) var(--s8); border-bottom:1px solid var(--border); }
.section.alt { background:var(--bg2); }
.inner { max-width:1120px; margin:0 auto; }
.sec-head { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:var(--s3); margin-bottom:var(--s6); }
.sec-head h2 { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:30px; text-transform:uppercase; letter-spacing:.02em; }
.sec-sub { font-size:13px; color:var(--muted); margin-top:3px; }
.two-col { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:var(--s3); }
@media(max-width:768px) { .section { padding:var(--s6) var(--s5); } .two-col { grid-template-columns:1fr; } }

/* ── Buttons ─────────────────────────────────────────────────── */
.btn-primary {
  font-weight:700; font-size:15px; background:var(--cyan); color:#000;
  border-radius:var(--r2); padding:14px 28px;
  transition:background .15s,transform .12s,box-shadow .15s;
  display:inline-flex; align-items:center; gap:7px; white-space:nowrap;
}
.btn-primary:hover { background:#00edd0; transform:translateY(-1px); box-shadow:0 0 0 3px rgba(0,212,180,.22); }
.btn-primary.sm { font-size:13px; padding:10px 18px; }
.btn-primary.added { background:var(--green); }
.btn-primary:disabled { opacity:.75; cursor:default; transform:none; box-shadow:none; }
.btn-outline {
  font-family:'DM Mono',monospace; font-size:12px; color:var(--muted);
  border:1px solid var(--border); border-radius:var(--r3); padding:9px 18px;
  transition:border-color .15s,color .15s,background .15s; white-space:nowrap;
  display:inline-flex; align-items:center; gap:5px;
}
.btn-outline:hover { border-color:var(--bhi); color:var(--text); background:rgba(255,255,255,.03); }
.btn-ghost {
  font-family:'DM Mono',monospace; font-size:12px; color:var(--muted);
  border:1px solid var(--border); border-radius:var(--r3); padding:10px 14px;
  transition:border-color .15s,color .15s;
  display:inline-flex; align-items:center; gap:5px;
}
.btn-ghost:hover { border-color:var(--bhi); color:var(--text); }
.btn-yellow { font-weight:700; font-size:14px; background:var(--yellow); color:#000; border-radius:var(--r3); padding:12px 22px; transition:background .15s,transform .12s; display:inline-flex; align-items:center; }
.btn-yellow:hover { background:#fdd458; transform:translateY(-1px); }
@media(prefers-reduced-motion:reduce) { .btn-primary,.btn-yellow { transition:none; transform:none!important; box-shadow:none!important; } }

/* ── Risk pills ──────────────────────────────────────────────── */
.pill {
  display:inline-flex; align-items:center;
  font-family:'DM Mono',monospace; font-size:11px;
  padding:3px 9px; border-radius:20px; border:1px solid;
}
.pill-stable  { color:#7cf7e6; border-color:rgba(0,212,180,.3); background:var(--cdim); }
.pill-watch   { color:#f5e07a; border-color:rgba(245,197,66,.3); background:var(--ydim); }
.pill-fragile { color:#f87171; border-color:rgba(248,113,113,.3); background:var(--rdim); }
.pill-hit     { color:#86efac; border-color:rgba(34,197,94,.3);  background:var(--gdim); }
.pill-miss    { color:#f87171; border-color:rgba(248,113,113,.3); background:var(--rdim); }
.pill-neutral { color:var(--muted); border-color:var(--border); background:rgba(255,255,255,.04); }

/* ── Hero ────────────────────────────────────────────────────── */
.hero {
  background:linear-gradient(135deg,#0c0f16 0%,#0f1520 55%,#0c1118 100%);
  padding:var(--s8) var(--s8) var(--s7); position:relative; overflow:hidden;
}
.hero-blob1 { position:absolute; width:700px; height:400px; border-radius:50%; background:radial-gradient(ellipse,rgba(0,212,180,.065),transparent 68%); top:-60px; right:-80px; pointer-events:none; }
.hero-blob2 { position:absolute; width:500px; height:320px; border-radius:50%; background:radial-gradient(ellipse,rgba(34,197,94,.04),transparent 70%); bottom:-40px; left:-60px; pointer-events:none; }
.hero-inner { max-width:1120px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:var(--s8); align-items:start; position:relative; z-index:2; }
.hero-copy { display:grid; gap:var(--s5); }
.eyebrow { display:inline-flex; gap:var(--s2); align-items:center; font-family:'DM Mono',monospace; font-size:11px; color:var(--cyan); letter-spacing:.06em; text-transform:uppercase; }
.edot { width:6px; height:6px; border-radius:50%; background:var(--cyan); }
@media(prefers-reduced-motion:no-preference) { .edot { animation:pulse 2s ease infinite; } }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
.hero h1 { font-family:'Barlow Condensed',sans-serif; font-weight:900; font-size:58px; line-height:.9; text-transform:uppercase; letter-spacing:.01em; }
.hero h1 em { color:var(--cyan); font-style:normal; }
.hero-sub { font-size:16px; color:var(--muted); line-height:1.65; max-width:460px; }
.hero-actions { display:grid; gap:var(--s3); }
.cta-row { display:flex; gap:var(--s2); flex-wrap:wrap; }
.hero-hint { font-family:'DM Mono',monospace; font-size:12px; color:var(--muted); line-height:1.5; }
.hero-hint strong { color:var(--cyan); font-weight:500; }
.hero-signals { display:grid; gap:var(--s2); }
.signals-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; }
.sig-label { font-family:'DM Mono',monospace; font-size:10px; color:var(--cyan); letter-spacing:.1em; text-transform:uppercase; }
.see-all { font-family:'DM Mono',monospace; font-size:11px; color:var(--muted); cursor:pointer; transition:color .15s; }
.see-all:hover { color:var(--text); }
@media(max-width:960px) { .hero-inner { grid-template-columns:1fr; gap:var(--s6); } .hero h1 { font-size:44px; } }
@media(max-width:600px) { .hero { padding:var(--s6) var(--s5); } .hero h1 { font-size:38px; } }

/* ── Prop card ───────────────────────────────────────────────── */
.prop-card {
  background:var(--card); border:1px solid var(--border); border-radius:var(--r);
  padding:var(--s4); display:grid; gap:var(--s3);
  box-shadow:var(--shadow);
  transition:border-color .2s,box-shadow .2s,transform .18s;
}
.prop-card:hover { border-color:var(--cmid); box-shadow:var(--shadow-lg),0 0 0 1px rgba(0,212,180,.12); transform:translateY(-2px); }
@media(prefers-reduced-motion:reduce) { .prop-card:hover { transform:none; } }
.pc-top { display:flex; justify-content:space-between; align-items:flex-start; gap:var(--s3); }
.pc-meta { display:grid; gap:3px; flex:1; min-width:0; }
.pc-match { font-size:11px; color:var(--muted); font-weight:500; display:flex; gap:5px; align-items:center; flex-wrap:wrap; }
.sport-tag { font-family:'DM Mono',monospace; font-size:10px; background:rgba(255,255,255,.06); border:1px solid var(--border); padding:1px 6px; border-radius:3px; color:var(--dim); }
.venue-line { font-family:'DM Mono',monospace; font-size:10px; color:var(--dim); line-height:1.3; }
.pc-name { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:21px; text-transform:uppercase; line-height:1.1; letter-spacing:.01em; }
.pc-odds-col { text-align:right; flex-shrink:0; display:grid; gap:3px; }
.pc-odds { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:22px; }
.pc-books { font-family:'DM Mono',monospace; font-size:10px; color:var(--muted); }
.hit-row { display:flex; align-items:center; gap:var(--s3); }
.hit-wrap { flex:1; height:4px; background:rgba(255,255,255,.07); border-radius:2px; overflow:hidden; }
.hit-fill { height:100%; border-radius:2px; background:var(--cyan); transition:width 1s .1s; }
.hit-fill.warn { background:var(--yellow); }
.hit-lbl { font-family:'DM Mono',monospace; font-size:11px; color:var(--cyan-lt); font-weight:500; white-space:nowrap; }
.hit-lbl.warn { color:var(--yellow); }
.pc-reasons { display:grid; gap:3px; }
.pc-reason { font-size:12px; color:#aabbc8; line-height:1.45; display:flex; gap:5px; align-items:baseline; }
.pc-reason::before { content:'·'; color:var(--cyan); font-size:14px; line-height:1; flex-shrink:0; }
.pc-reason.bad { color:var(--red); }
.pc-reason.bad::before { color:var(--red); }
.pc-actions { display:flex; gap:var(--s2); border-top:1px solid rgba(255,255,255,.06); padding-top:var(--s3); }
.pc-actions .btn-primary { flex:1; justify-content:center; }

/* ── Slip bar (floating, right on desktop, full-width on mobile) */
.slip-bar {
  position:fixed; bottom:var(--s3); right:var(--s4); z-index:500;
  width:380px;
  background:rgba(16,20,30,.98);
  border:1px solid rgba(0,212,180,.28); border-radius:var(--r);
  padding:var(--s3) var(--s4);
  box-shadow:var(--shadow-lg),0 0 0 1px rgba(0,212,180,.06);
  backdrop-filter:blur(14px);
  transform:translateY(140%);
  transition:transform .28s cubic-bezier(.22,.61,.36,1);
}
.slip-bar.visible { transform:translateY(0); }
@media(max-width:960px) {
  .slip-bar { left:var(--s3); right:var(--s3); width:auto; bottom:var(--s3); }
}
.slip-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--s2); }
.slip-lbl { font-family:'DM Mono',monospace; font-size:11px; color:var(--muted); display:flex; align-items:center; gap:6px; }
.slip-count { background:var(--cyan); color:#000; border-radius:20px; padding:1px 7px; font-size:11px; font-weight:700; }
.slip-close { color:var(--dim); font-size:18px; padding:0 var(--s1); transition:color .15s; }
.slip-close:hover { color:var(--muted); }
.slip-legs { display:grid; gap:var(--s1); max-height:180px; overflow-y:auto; margin-bottom:var(--s3); }
.slip-leg {
  display:flex; justify-content:space-between; align-items:flex-start;
  padding:7px var(--s2); border:1px solid rgba(255,255,255,.05);
  border-radius:var(--r3); background:rgba(255,255,255,.02); gap:var(--s2);
}
.slip-leg-meta { display:grid; gap:2px; flex:1; min-width:0; }
.slip-leg-label { font-size:12px; font-weight:500; }
.slip-leg-venue { font-family:'DM Mono',monospace; font-size:10px; color:var(--dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.slip-leg-right { display:flex; align-items:center; gap:var(--s1); flex-shrink:0; }
.slip-leg-odds { font-family:'DM Mono',monospace; font-size:12px; color:var(--cyan-lt); }
.slip-leg-rm { color:var(--dim); font-size:13px; transition:color .15s; padding:2px; }
.slip-leg-rm:hover { color:var(--red); }
.slip-odds-row {
  display:flex; justify-content:space-between; align-items:center;
  padding:var(--s2); background:rgba(255,255,255,.025);
  border:1px solid rgba(255,255,255,.05); border-radius:var(--r3);
  font-size:12px; color:var(--muted); margin-bottom:var(--s2);
}
.slip-combined { font-family:'DM Mono',monospace; color:var(--cyan-lt); font-size:13px; font-weight:500; }
.slip-fragility {
  padding:var(--s2) var(--s3); border:1px solid rgba(245,197,66,.25);
  border-radius:var(--r3); background:var(--ydim);
  font-size:12px; color:#e0d070; line-height:1.5;
  margin-bottom:var(--s2); display:none;
}
.slip-fragility.show { display:block; }
.slip-fragility strong { color:var(--yellow); }
.slip-fragility .flink { color:var(--yellow); cursor:pointer; text-decoration:underline; font-family:'DM Mono',monospace; font-size:11px; }
.slip-actions { display:flex; gap:var(--s2); }
.slip-actions .btn-primary { flex:1; justify-content:center; font-size:14px; padding:13px; }
.slip-actions .btn-ghost { padding:13px var(--s4); }

/* ── Ideas section ───────────────────────────────────────────── */
.ideas-scroll { display:flex; gap:var(--s3); overflow-x:auto; padding-bottom:var(--s2); }
.idea-card {
  min-width:280px; max-width:320px; flex-shrink:0;
  background:var(--card); border:1px solid var(--border); border-radius:var(--r);
  padding:var(--s4); display:grid; gap:var(--s3);
  box-shadow:var(--shadow);
  transition:border-color .2s;
}
.idea-card:hover { border-color:var(--bhi); }
.idea-head { display:flex; justify-content:space-between; align-items:center; gap:var(--s2); }
.idea-name { font-size:14px; font-weight:600; }
.idea-legs { display:grid; gap:3px; }
.idea-leg { font-size:12px; color:var(--muted); display:flex; gap:5px; align-items:baseline; }
.idea-leg::before { content:'·'; color:var(--cyan); font-size:14px; line-height:1; flex-shrink:0; }

/* ── Postmortem cards ────────────────────────────────────────── */
.pm-card {
  background:var(--card); border:1px solid rgba(255,79,94,.15); border-radius:var(--r);
  padding:var(--s4); display:grid; gap:var(--s3); box-shadow:var(--shadow);
}
.pm-head { display:flex; justify-content:space-between; align-items:flex-start; gap:var(--s2); }
.pm-title { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:19px; text-transform:uppercase; margin-top:3px; }
.pm-note { font-size:12px; color:var(--muted); line-height:1.55; }
.pm-legs { display:grid; gap:var(--s1); }
.pm-leg { display:flex; justify-content:space-between; align-items:center; padding:6px var(--s2); border:1px solid rgba(255,255,255,.05); border-radius:var(--r3); background:rgba(255,255,255,.02); font-size:12px; }
.pm-leg-label { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:var(--s2); }
.pm-actions { display:flex; gap:var(--s2); }
.pm-actions .btn-primary { flex:1; justify-content:center; }

/* ── Backend note ────────────────────────────────────────────── */
.backend-note {
  border:1px solid var(--border); border-radius:var(--r2);
  padding:var(--s4); background:rgba(255,255,255,.02);
  font-size:12px; color:var(--muted);
}
.backend-note h4 { font-size:13px; color:var(--text); margin-bottom:var(--s2); }
.backend-note li { display:flex; gap:6px; margin-bottom:5px; align-items:baseline; }
.backend-note li::before { content:'·'; color:var(--cyan); font-size:14px; line-height:1; flex-shrink:0; }

/* ── Bottom CTA ──────────────────────────────────────────────── */
.bottom-cta { padding:var(--s9) var(--s8) 80px; text-align:center; position:relative; overflow:hidden; border-bottom:none; }
.b-glow { position:absolute; left:50%; top:50%; width:700px; height:300px; border-radius:50%; transform:translate(-50%,-50%); background:radial-gradient(ellipse,rgba(0,212,180,.05),transparent 70%); pointer-events:none; }
.bottom-cta h2 { font-family:'Barlow Condensed',sans-serif; font-weight:900; font-size:52px; text-transform:uppercase; letter-spacing:.01em; line-height:.9; margin-bottom:var(--s4); position:relative; z-index:1; }
.bottom-cta h2 span { color:var(--cyan); }
.bottom-cta p { font-size:16px; color:var(--muted); max-width:440px; margin:0 auto var(--s6); position:relative; z-index:1; }
.bcta-row { display:flex; gap:var(--s3); justify-content:center; flex-wrap:wrap; position:relative; z-index:1; }
@media(max-width:600px) { .bottom-cta { padding:var(--s7) var(--s5) 100px; } .bottom-cta h2 { font-size:38px; } }

/* ── Footer ──────────────────────────────────────────────────── */
.footer { border-top:1px solid var(--border); padding:var(--s5) var(--s8); display:flex; justify-content:space-between; flex-wrap:wrap; gap:var(--s3); align-items:center; }
.footer-logo { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:15px; text-transform:uppercase; letter-spacing:.04em; color:var(--dim); }
.footer-note { font-family:'DM Mono',monospace; font-size:10px; color:var(--dim); }
@media(max-width:600px) { .footer { padding:var(--s4) var(--s5); } }

/* ── Toast ───────────────────────────────────────────────────── */
.toast {
  position:fixed; bottom:88px; left:50%; transform:translateX(-50%) translateY(8px);
  background:rgba(0,212,180,.12); border:1px solid rgba(0,212,180,.32);
  color:var(--cyan-lt); font-family:'DM Mono',monospace; font-size:12px;
  padding:7px 16px; border-radius:var(--r3); z-index:600;
  opacity:0; transition:opacity .2s,transform .2s; pointer-events:none; white-space:nowrap;
}
.toast.show { opacity:1; transform:translateX(-50%) translateY(0); }

/* ── Stagger entrance ────────────────────────────────────────── */
.stagger > * { opacity:0; transform:translateY(10px); animation:fi .4s ease forwards; }
.stagger > *:nth-child(1) { animation-delay:.04s; }
.stagger > *:nth-child(2) { animation-delay:.11s; }
.stagger > *:nth-child(3) { animation-delay:.18s; }
.stagger > *:nth-child(4) { animation-delay:.25s; }
@keyframes fi { to { opacity:1; transform:none; } }
@media(prefers-reduced-motion:reduce) { .stagger > * { animation:none; opacity:1; transform:none; } }
</style>
</head>
<body>

<!-- ── Nav ── -->
<nav class="nav">
  <div class="logo">Research<span>Bets</span></div>
  <div class="nav-links">
    <a href="#board">Tonight's Board</a>
    <a href="#ideas">Parlay Ideas</a>
    <a href="#review">Postmortem</a>
  </div>
  <button class="btn-nav" id="nav-analyze">Analyze Slip</button>
</nav>

<!-- ── Spine ── -->
<div class="spine">
  <span id="spine-sport">NBA</span>
  <span class="sep">·</span>
  <span id="spine-date">-</span>
  <span class="sep">·</span>
  <span id="spine-slate">-</span>
  <span class="sep">·</span>
  <span class="mode-chip" id="spine-mode">Demo mode</span>
</div>

<!-- ── Hero ── -->
<section class="hero">
  <div class="hero-blob1"></div>
  <div class="hero-blob2"></div>
  <div class="hero-inner">
    <div class="hero-copy stagger">
      <div class="eyebrow"><span class="edot"></span> Tonight's slate is ready</div>
      <h1>Find strong<br/><em>props</em><br/>tonight</h1>
      <p class="hero-sub">Start with tonight's top signals. Add the legs you like. See which ones carry the most risk before you commit.</p>
      <div class="hero-actions">
        <div class="cta-row">
          <button class="btn-primary" data-go="/slip">Build your slip</button>
          <button class="btn-outline" data-go="/today">Explore board</button>
        </div>
        <p class="hero-hint">New? <strong>Add legs from the board below</strong>, then run a risk check before you submit.</p>
      </div>
    </div>

    <div class="hero-signals" id="hero-signals">
      <div class="signals-head">
        <span class="sig-label">Top signals tonight</span>
        <span class="see-all" data-go="/today">See all →</span>
      </div>
      <div class="stagger" id="hero-cards"><!-- filled by JS --></div>
    </div>
  </div>
</section>

<!-- ── Board ── -->
<section class="section alt" id="board">
  <div class="inner">
    <div class="sec-head">
      <div>
        <h2>Tonight's Board</h2>
        <p class="sec-sub">Top-signaled props for the slate</p>
      </div>
      <button class="btn-outline" data-go="/today">Full board →</button>
    </div>
    <div class="two-col stagger" id="board-cards"><!-- filled by JS --></div>
  </div>
</section>

<!-- ── Parlay ideas ── -->
<section class="section" id="ideas">
  <div class="inner">
    <div class="sec-head">
      <div>
        <h2>Parlay Ideas</h2>
        <p class="sec-sub">Quick builds you can start from, then adjust</p>
      </div>
      <button class="btn-outline" data-go="/slip">Open slip →</button>
    </div>
    <div class="ideas-scroll stagger" id="ideas-cards"><!-- filled by JS --></div>
  </div>
</section>

<!-- ── Postmortem ── -->
<section class="section alt" id="review">
  <div class="inner">
    <div class="sec-head">
      <div>
        <h2>Postmortem</h2>
        <p class="sec-sub">Review past slips and spot patterns</p>
      </div>
      <button class="btn-outline" data-go="/control?tab=review">Open review →</button>
    </div>
    <div class="two-col stagger" id="pm-cards"><!-- filled by JS --></div>
    <div class="backend-note" style="margin-top:var(--s4)">
      <h4>How this connects to the backend</h4>
      <ul>
        <li>Board pulls from <code>GET /api/today</code> — game start time and venue hydrate from real data when available.</li>
        <li>Slip bar hydrates from <code>useDraftSlip</code> and <code>SlipIntelBar</code>; <code>computeSlipSummary</code> mirrors <code>computeSlipIntelligence</code>.</li>
        <li>Postmortem preview lists recent slips from Supabase or local store, then deep-links to <code>/control?tab=review</code>.</li>
        <li>All CTAs use <code>nervous.toHref(path)</code> in the repo to preserve sport / tz / date / mode context.</li>
      </ul>
    </div>
  </div>
</section>

<!-- ── Bottom CTA ── -->
<section class="section bottom-cta">
  <div class="b-glow"></div>
  <h2>Start with the<br/><span>board tonight.</span></h2>
  <p>Browse signals, build your slip, and run a risk check before you submit anything.</p>
  <div class="bcta-row">
    <button class="btn-primary" data-go="/slip">Build your slip</button>
    <button class="btn-outline" data-go="/ingest">Analyze slip</button>
  </div>
</section>

<!-- ── Footer ── -->
<footer class="footer">
  <div class="footer-logo">Research<span style="color:var(--cyan)">Bets</span></div>
  <div class="footer-note">Research tool only · Not financial advice · Gamble responsibly</div>
  <div class="footer-note" id="footer-mode">Demo mode — deterministic fallback active</div>
</footer>

<!-- ── Slip bar ── -->
<div class="slip-bar" id="slip-bar">
  <div class="slip-top">
    <div class="slip-lbl">My Slip <span class="slip-count" id="slip-count">0</span></div>
    <button class="slip-close" id="slip-clear" aria-label="Clear slip">×</button>
  </div>
  <div class="slip-legs" id="slip-legs"></div>
  <div class="slip-odds-row">
    <span>Combined odds</span>
    <span class="slip-combined" id="slip-combined">—</span>
  </div>
  <div class="slip-fragility" id="slip-frag">
    <strong>Weakest leg: <span id="frag-name"></span></strong><br/>
    This leg carries the most downside risk.
    <span class="flink" data-go="/stress-test?detail=weakest">Check why →</span>
  </div>
  <div class="slip-actions">
    <button class="btn-primary" data-go="/stress-test">Run risk check</button>
    <button class="btn-ghost" data-go="/slip">Edit</button>
  </div>
</div>

<!-- ── Toast ── -->
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script>
/* ═══════════════════════════════════════════════════════════════
   Data contracts (mirrors TSX types)
   ═══════════════════════════════════════════════════════════════ */

/**
 * @typedef {{ book:string, odds:number }} BookOdds
 * @typedef {{ id:string, league:string, away:string, home:string, startISO:string, venue:string, city:string, state:string }} Game
 * @typedef {{ id:string, gameId:string, player:string, market:string, line:number, pick:'over'|'under', consensusOdds:number, books:BookOdds[], hitRateL10:number, trendNote:string, reasons:string[], riskTag?:'watch'|'fragile' }} BoardProp
 * @typedef {{ mode:string, sport:string, tz:string, dateISO:string, slateLabel:string, games:Game[], board:BoardProp[] }} TodayPayload
 * @typedef {{ id:string, label:string, odds:number, gameId:string, startISO:string, venueLine:string }} SlipLeg
 * @typedef {{ id:string, placedAtISO:string, legs:{label:string,result:'hit'|'miss'|'push'|'unknown'}[], classification:string, note:string }} Postmortem
 */

/* ── Utilities ─────────────────────────────────────────────── */
function clamp01(n) { return Math.max(0, Math.min(1, n)); }

function fmtAmerican(odds) {
  const o = Math.trunc(odds);
  return o > 0 ? `+${o}` : `${o}`;
}

function americanToImplied(odds) {
  const o = Math.trunc(odds);
  return o < 0 ? Math.abs(o) / (Math.abs(o) + 100) : 100 / (o + 100);
}

function impliedToAmerican(p) {
  const pp = clamp01(p);
  if (pp <= 0 || pp >= 1) return 0;
  return pp >= 0.5
    ? -Math.round((pp / (1 - pp)) * 100)
    : Math.round(((1 - pp) / pp) * 100);
}

function joinVenueLine(g) {
  const d = new Date(g.startISO);
  const time = d.toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });
  const day  = d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
  return `${day} ${time} · ${g.venue} · ${g.city}, ${g.state}`;
}

function fmtDateLabel(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
}

/* ── Slip math (mirrors computeSlipIntelligence) ───────────── */
function computeSlipSummary(legs) {
  if (!legs.length) return { combinedOdds:0, weakest:null, fragility:'' };
  const imp = legs.reduce((a, l) => a * americanToImplied(l.odds), 1);
  const combinedOdds = impliedToAmerican(imp);
  // Weakest = lowest implied prob (closest to coin flip or worse)
  const weakest = legs.slice().sort((a,b) => americanToImplied(a.odds) - americanToImplied(b.odds))[0] || null;
  const fragility = legs.length >= 3 ? 'Higher leg count increases miss surface' : '';
  return { combinedOdds, weakest, fragility };
}

/* ── localStorage ─────────────────────────────────────────── */
const LS_SLIP = 'rb_demo_draft_slip_v1';
const LS_PM   = 'rb_demo_postmortems_v1';

function readLS(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ── Fallback data (mirrors fallbackToday() in TSX) ──────── */
function fallbackToday() {
  const base = new Date();
  const mkISO = (h, m) => { const d = new Date(base); d.setHours(h,m,0,0); return d.toISOString(); };

  const games = [
    { id:'g1', league:'NBA', away:'BOS', home:'MIA', startISO:mkISO(19,30), venue:'Kaseya Center', city:'Miami', state:'FL' },
    { id:'g2', league:'NBA', away:'DEN', home:'MIN', startISO:mkISO(21,0),  venue:'Target Center', city:'Minneapolis', state:'MN' },
    { id:'g3', league:'NBA', away:'LAL', home:'GSW', startISO:mkISO(22,0),  venue:'Chase Center', city:'San Francisco', state:'CA' },
  ];

  const board = [
    { id:'p_tatum', gameId:'g1', player:'Tatum', market:'PTS', line:28.5, pick:'over', consensusOdds:-112,
      books:[{book:'FanDuel',odds:-114},{book:'DraftKings',odds:-110}],
      hitRateL10:0.64, trendNote:'3 of last 4 hit',
      reasons:['Role volume stable last 5 games','Opponent allows high wing usage rate'] },
    { id:'p_jokic', gameId:'g2', player:'Jokic', market:'REB', line:10.5, pick:'over', consensusOdds:-105,
      books:[{book:'FanDuel',odds:-108},{book:'DraftKings',odds:-102}],
      hitRateL10:0.61, trendNote:'2 of last 4 hit',
      reasons:['High pace matchup expected','MIN weak on defensive boards','Blowout risk flagged'],
      riskTag:'fragile' },
    { id:'p_curry', gameId:'g3', player:'Curry', market:'3PM', line:4.5, pick:'over', consensusOdds:108,
      books:[{book:'FanDuel',odds:105},{book:'DraftKings',odds:110}],
      hitRateL10:0.58, trendNote:'4 of last 5 hit',
      reasons:['LAL allows 14.2 3PA to guards','Volume trending up last 3 games'],
      riskTag:'watch' },
    { id:'p_giannis', gameId:'g2', player:'Giannis', market:'PTS', line:32.5, pick:'over', consensusOdds:-108,
      books:[{book:'FanDuel',odds:-110},{book:'DraftKings',odds:-106}],
      hitRateL10:0.70, trendNote:'5 of last 7 hit',
      reasons:['PHI gives up 28+ to power forwards','Usage rate up last 4 games'] },
  ];

  const dateISO = new Date(base.getFullYear(), base.getMonth(), base.getDate()).toISOString();
  return { mode:'demo', sport:'NBA', tz:'local', dateISO, slateLabel:`${games.length} games on slate`, games, board };
}

function seedPostmortems() {
  const y = new Date(Date.now() - 86400000);
  return [{
    id:'pm1', placedAtISO:y.toISOString(),
    legs:[
      { label:'Tatum PTS 28.5 O', result:'hit' },
      { label:'Jokic REB 10.5 O', result:'miss' },
      { label:'Curry 3PM 4.5 O',  result:'hit' },
    ],
    classification:'Rotation Volatility',
    note:'Fourth-quarter minutes dropped after a late blowout swing. Avoid stacking legs from high-spread games.'
  }];
}

/* ── normalizeTodayPayload — accepts real /api/today variance ─ */
function normalizeTodayPayload(data) {
  const fb = fallbackToday();
  const mode = ['live','cache','demo'].includes(data?.mode) ? data.mode : 'demo';
  const sport = data?.sport || data?.league || 'NBA';
  const tz    = data?.tz || 'local';
  const dateISO = data?.dateISO || data?.date || fb.dateISO;

  const games = Array.isArray(data?.games)
    ? data.games.map((g, i) => ({
        id: String(g.id ?? g.gameId ?? `g_${i}`),
        league: g.league || g.sport || sport,
        away: String(g.away ?? g.awayTeam ?? g.a ?? 'AWY'),
        home: String(g.home ?? g.homeTeam ?? g.h ?? 'HME'),
        startISO: String(g.startISO ?? g.startTime ?? g.start ?? new Date().toISOString()),
        venue: String(g.venue ?? g.arena ?? 'Venue'),
        city:  String(g.city ?? ''),
        state: String(g.state ?? ''),
      }))
    : fb.games;

  const board = Array.isArray(data?.board)
    ? data.board.map((p, i) => ({
        id: String(p.id ?? p.propId ?? `p_${i}`),
        gameId: String(p.gameId ?? p.game_id ?? games[0]?.id ?? 'g1'),
        player: String(p.player ?? p.name ?? 'Player'),
        market: String(p.market ?? p.stat ?? 'PTS'),
        line:   Number(p.line ?? p.total ?? 0),
        pick:   p.pick === 'under' ? 'under' : 'over',
        consensusOdds: Number(p.consensusOdds ?? p.odds ?? -110),
        books: Array.isArray(p.books)
          ? p.books.map(b => ({ book: String(b.book ?? b.name ?? 'Book'), odds: Number(b.odds ?? -110) }))
          : [{ book:'FanDuel', odds: Number(p.fd ?? -110) }, { book:'DraftKings', odds: Number(p.dk ?? -110) }],
        hitRateL10: clamp01(Number(p.hitRateL10 ?? p.hit_rate_l10 ?? p.hitRate ?? 0.55)),
        trendNote:  String(p.trendNote ?? p.trend ?? ''),
        reasons:    Array.isArray(p.reasons) ? p.reasons.map(String) : [],
        riskTag:    p.riskTag,
      }))
    : fb.board;

  return { mode, sport, tz, dateISO, slateLabel: data?.slateLabel || `${games.length} games on slate`, games, board };
}

/* ═══════════════════════════════════════════════════════════════
   App state
   ═══════════════════════════════════════════════════════════════ */

let TODAY   = fallbackToday();
let SLIP    = readLS(LS_SLIP, []);
let PMLIST  = readLS(LS_PM, []);
if (!PMLIST.length) { PMLIST = seedPostmortems(); writeLS(LS_PM, PMLIST); }

const IDEAS = [
  { id:'idea1', name:'2-leg quick hit', legs:['Tatum points','Curry threes'], propIds:['p_tatum','p_curry'], tag:'Popular', tone:'neutral' },
  { id:'idea2', name:'Risky boost',     legs:['Jokic rebounds','Tatum points','Curry threes'], propIds:['p_jokic','p_tatum','p_curry'], tag:'Higher payout', tone:'warn' },
];

let toastTimer = null;

/* ── Toast ───────────────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ── Route stub ──────────────────────────────────────────────── */
function go(path) {
  // In repo: router.push(nervous.toHref(path))
  showToast('Open: ' + path);
}

/* ── Delegate data-go clicks ─────────────────────────────────── */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-go]');
  if (el) { e.preventDefault(); go(el.dataset.go); }
});

/* ── Spine ────────────────────────────────────────────────────── */
function renderSpine() {
  document.getElementById('spine-sport').textContent = TODAY.sport;
  document.getElementById('spine-date').textContent  = fmtDateLabel(TODAY.dateISO);
  document.getElementById('spine-slate').textContent = TODAY.slateLabel;
  const chip = document.getElementById('spine-mode');
  chip.textContent = TODAY.mode === 'live' ? 'Live mode' : 'Demo mode';
  chip.className = 'mode-chip' + (TODAY.mode === 'live' ? ' live' : '');
  document.getElementById('footer-mode').textContent =
    TODAY.mode === 'live' ? 'Live mode' : 'Demo mode — deterministic fallback active';
}

/* ── Prop card HTML ─────────────────────────────────────────── */
function propCardHTML(p, gameMap, opts = {}) {
  const g = gameMap.get(p.gameId) || TODAY.games[0];
  const d = new Date(p.startISO || g.startISO);
  const time = d.toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });
  const venueStr = joinVenueLine(g);
  const oddsColor = p.consensusOdds > 0 ? 'green' : '';
  const isFragile = p.riskTag === 'fragile';
  const isWatch   = p.riskTag === 'watch';
  const pillClass = isFragile ? 'pill-fragile' : isWatch ? 'pill-watch' : 'pill-stable';
  const pillLabel = isFragile ? 'fragile' : isWatch ? 'watch' : 'stable';
  const hitWarn   = p.hitRateL10 < 0.6;
  const ctaLabel  = isFragile ? 'Check risk' : 'Scout';
  const ctaRoute  = isFragile ? '/stress-test?detail=weakest' : '/stress-test';
  const isAdded   = SLIP.some(l => l.id === p.id);

  return `<div class="prop-card" data-propid="${p.id}">
    <div class="pc-top">
      <div class="pc-meta">
        <div class="pc-match">
          ${g.away} @ ${g.home}
          <span class="sport-tag">${g.league}</span>
          <span class="pill ${pillClass}">${pillLabel}</span>
        </div>
        <div class="pc-name">${p.player} ${p.market} ${p.pick === 'over' ? 'over' : 'under'} ${p.line}</div>
        <div class="venue-line">${venueStr}</div>
      </div>
      <div class="pc-odds-col">
        <div class="pc-odds ${oddsColor}">${fmtAmerican(p.consensusOdds)}</div>
        <div class="pc-books">${p.books.map(b=>`${b.book} ${fmtAmerican(b.odds)}`).join(' | ')}</div>
      </div>
    </div>
    <div class="hit-row">
      <div class="hit-wrap"><div class="hit-fill${hitWarn?' warn':''}" style="width:${Math.round(p.hitRateL10*100)}%"></div></div>
      <span class="hit-lbl${hitWarn?' warn':''}">
        ${Math.round(p.hitRateL10*100)}% L10${p.trendNote ? ' · '+p.trendNote : ''}
      </span>
    </div>
    <div class="pc-reasons">
      ${p.reasons.slice(0,3).map(r => `<div class="pc-reason${r.toLowerCase().includes('blowout')||r.toLowerCase().includes('risk')?' bad':''}">${r}</div>`).join('')}
    </div>
    <div class="pc-actions">
      <button class="btn-primary sm${isAdded?' added':''}" onclick="handleAddLeg('${p.id}')" ${isAdded?'disabled':''}>
        ${isAdded
          ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Added'
          : '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Add to slip'}
      </button>
      <button class="btn-ghost" data-go="${ctaRoute}">${ctaLabel}</button>
    </div>
  </div>`;
}

/* ── Render board ───────────────────────────────────────────── */
function renderBoard() {
  const gameMap = new Map(TODAY.games.map(g => [g.id, g]));

  // Hero cards (first 2)
  document.getElementById('hero-cards').innerHTML =
    TODAY.board.slice(0,2).map(p => propCardHTML(p, gameMap)).join('');

  // Full board
  document.getElementById('board-cards').innerHTML =
    TODAY.board.map(p => propCardHTML(p, gameMap)).join('');
}

/* ── Render ideas ───────────────────────────────────────────── */
function renderIdeas() {
  document.getElementById('ideas-cards').innerHTML = IDEAS.map(idea => {
    const pillClass = idea.tone === 'warn' ? 'pill-watch' : 'pill-neutral';
    return `<div class="idea-card">
      <div class="idea-head">
        <div class="idea-name">${idea.name}</div>
        <span class="pill ${pillClass}">${idea.tag}</span>
      </div>
      <div class="idea-legs">
        ${idea.legs.map(l => `<div class="idea-leg">${l}</div>`).join('')}
      </div>
      <button class="btn-primary sm" style="justify-content:center;margin-top:var(--s1)" onclick="handleAddIdea('${idea.id}')">
        Add idea to slip
      </button>
    </div>`;
  }).join('');
}

/* ── Render postmortems ─────────────────────────────────────── */
function renderPostmortems() {
  document.getElementById('pm-cards').innerHTML = PMLIST.slice(0,2).map(pm => {
    const when   = fmtDateLabel(pm.placedAtISO);
    const hits   = pm.legs.filter(l=>l.result==='hit').length;
    const misses = pm.legs.filter(l=>l.result==='miss').length;
    const summPill = misses ? 'pill-miss' : 'pill-hit';
    return `<div class="pm-card">
      <div class="pm-head">
        <div>
          <div class="mono muted" style="font-size:11px">${when}</div>
          <div class="pm-title">${pm.classification}</div>
        </div>
        <span class="pill ${summPill}">${hits} hit, ${misses} miss</span>
      </div>
      <div class="pm-note">${pm.note}</div>
      <div class="pm-legs">
        ${pm.legs.slice(0,3).map(l => {
          const cls = l.result==='hit' ? 'green' : l.result==='miss' ? 'red' : 'muted';
          return `<div class="pm-leg">
            <div class="pm-leg-label">${l.label}</div>
            <span class="mono ${cls}" style="font-size:11px">${l.result}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="pm-actions">
        <button class="btn-ghost" data-go="/control?tab=review">Full breakdown</button>
        <button class="btn-primary sm" data-go="/slip">Build again</button>
      </div>
    </div>`;
  }).join('');
}

/* ── Slip rendering ─────────────────────────────────────────── */
function renderSlip() {
  writeLS(LS_SLIP, SLIP);
  const bar     = document.getElementById('slip-bar');
  const legsEl  = document.getElementById('slip-legs');
  const countEl = document.getElementById('slip-count');
  const combEl  = document.getElementById('slip-combined');
  const fragEl  = document.getElementById('slip-frag');
  const fragName= document.getElementById('frag-name');

  countEl.textContent = SLIP.length;

  if (!SLIP.length) {
    bar.classList.remove('visible');
    legsEl.innerHTML = '';
    combEl.textContent = '—';
    fragEl.classList.remove('show');
    return;
  }

  bar.classList.add('visible');

  legsEl.innerHTML = SLIP.map((l,i) => `
    <div class="slip-leg">
      <div class="slip-leg-meta">
        <div class="slip-leg-label">${l.label}</div>
        <div class="slip-leg-venue">${l.venueLine}</div>
      </div>
      <div class="slip-leg-right">
        <span class="slip-leg-odds">${fmtAmerican(l.odds)}</span>
        <button class="slip-leg-rm" onclick="handleRemoveLeg(${i})" aria-label="Remove leg">×</button>
      </div>
    </div>`).join('');

  const { combinedOdds, weakest } = computeSlipSummary(SLIP);
  combEl.textContent = combinedOdds ? fmtAmerican(combinedOdds) : '—';

  // Fragility: show if a fragile prop is in the slip and 2+ legs
  const fragLeg = SLIP.find(l => {
    const p = TODAY.board.find(b => b.id === l.id);
    return p && p.riskTag === 'fragile';
  }) || (SLIP.length >= 2 ? weakest : null);

  if (fragLeg && SLIP.length >= 2) {
    fragEl.classList.add('show');
    fragName.textContent = fragLeg.label;
  } else {
    fragEl.classList.remove('show');
  }

  // Refresh add buttons to reflect slip state
  document.querySelectorAll('.prop-card').forEach(card => {
    const pid = card.dataset.propid;
    if (!pid) return;
    const btn = card.querySelector('.btn-primary');
    if (!btn) return;
    const added = SLIP.some(l => l.id === pid);
    btn.disabled = added;
    btn.className = 'btn-primary sm' + (added ? ' added' : '');
    btn.innerHTML = added
      ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Added'
      : '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Add to slip';
    btn.onclick = added ? null : () => handleAddLeg(pid);
  });
}

/* ── Slip actions ────────────────────────────────────────────── */
function handleAddLeg(propId) {
  if (SLIP.some(l => l.id === propId)) return;
  const p = TODAY.board.find(b => b.id === propId);
  if (!p) return;
  const g = TODAY.games.find(x => x.id === p.gameId);
  if (!g) return;
  const label = `${p.player} ${p.market} ${p.line} ${p.pick === 'over' ? 'O' : 'U'}`;
  SLIP.push({ id:p.id, label, odds:p.consensusOdds, gameId:p.gameId, startISO:g.startISO, venueLine:joinVenueLine(g) });
  renderSlip();
}

function handleRemoveLeg(idx) {
  SLIP.splice(idx, 1);
  renderSlip();
}

document.getElementById('slip-clear').addEventListener('click', () => {
  SLIP = [];
  renderSlip();
});

function handleAddIdea(ideaId) {
  const idea = IDEAS.find(i => i.id === ideaId);
  if (!idea) return;
  const propsById = new Map(TODAY.board.map(p => [p.id, p]));
  let added = 0;
  for (const pid of idea.propIds) {
    if (SLIP.some(l => l.id === pid)) continue;
    const p = propsById.get(pid);
    if (!p) continue;
    const g = TODAY.games.find(x => x.id === p.gameId);
    if (!g) continue;
    SLIP.push({
      id: p.id,
      label: `${p.player} ${p.market} ${p.line} ${p.pick === 'over' ? 'O' : 'U'}`,
      odds: p.consensusOdds,
      gameId: p.gameId,
      startISO: g.startISO,
      venueLine: joinVenueLine(g),
    });
    added++;
  }
  if (added) { showToast(`Added: ${idea.name}`); renderSlip(); }
  else showToast('Already in slip');
}

/* ── Boot ────────────────────────────────────────────────────── */
function boot() {
  renderSpine();
  renderBoard();
  renderIdeas();
  renderPostmortems();
  renderSlip();

  // Attempt live hydration
  (async () => {
    try {
      const res = await fetch('/api/today', { cache:'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      TODAY = normalizeTodayPayload(data);
      renderSpine();
      renderBoard();
      renderSlip();
    } catch { /* stay on fallback */ }
  })();
}

boot();
</script>
</body>
</html>
