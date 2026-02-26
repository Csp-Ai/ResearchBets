/* ============================================================
   ResearchBets — landing.module.css
   Design system: Hybrid (terminal density + premium spatial clarity)
   Strategy: vNext hierarchy is canonical; legacy selectors preserved
   for back-compat via late-cascade overrides.
   ============================================================ */

/* ── Root & Tokens ─────────────────────────────────────────── */
.landingRoot {
  --bg:    #08090d;
  --bg2:   #0b0e14;
  --bg3:   #0d1118;
  --border: rgba(255,255,255,.07);
  --border-hi: rgba(255,255,255,.12);
  --cyan:  #00e5c8;
  --cyan-dim: rgba(0,229,200,.12);
  --cyan-mid: rgba(0,229,200,.25);
  --text:  #dde4ec;
  --muted: #60717e;
  --dim:   #2a3540;
  --red:   #ff4f5e;
  --yellow:#f5c542;
  --card:  #0a0d13;

  /* spacing scale: 8 12 16 20 24 32 40 56 */
  --s1: 8px;
  --s2: 12px;
  --s3: 16px;
  --s4: 20px;
  --s5: 24px;
  --s6: 32px;
  --s7: 40px;
  --s8: 56px;

  /* radius */
  --r1: 4px;
  --r2: 10px;

  /* elevation */
  --shadow-card:  0 4px 20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04);
  --shadow-hover: 0 10px 32px rgba(0,0,0,.45), 0 0 0 1px rgba(0,229,200,.14);

  background: var(--bg);
  color: var(--text);
  font-family: var(--font-barlow), sans-serif;
  overflow-x: hidden;
  font-size: 14px;
  line-height: 1.6;
}

.landingRoot :global(h1),
.landingRoot :global(h2),
.landingRoot :global(h3) {
  font-family: var(--font-barlow-condensed), sans-serif;
  text-transform: uppercase;
  letter-spacing: .01em;
}

/* ── Navigation ────────────────────────────────────────────── */
.nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 300;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px var(--s7);
  background: rgba(8,9,13,.96);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(8px);
}

.logo {
  font-family: var(--font-barlow-condensed), sans-serif;
  font-weight: 900;
  font-size: 19px;
  letter-spacing: .04em;
}
.logo span { color: var(--cyan); }

.nav ul {
  display: flex;
  gap: var(--s6);
  list-style: none;
}
.nav a {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  transition: color .18s;
}
.nav a:hover { color: var(--text); }

/* ── Button System (single source of truth) ────────────────── */
.btnNav,
.btnPrimary,
.btnSecondary,
.btnGhost,
.btnRun {
  font-family: var(--font-dm-mono), monospace;
  font-size: 12px;
  border-radius: var(--r1);
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background .18s, border-color .18s, color .18s, box-shadow .18s, transform .15s;
  line-height: 1;
  white-space: nowrap;
}

/* Primary */
.btnNav,
.btnPrimary {
  background: var(--cyan);
  color: #000;
  border: none;
  padding: var(--s1) var(--s4);
  font-weight: 700;
  letter-spacing: .02em;
}
.btnNav:hover,
.btnPrimary:hover {
  background: #00f5d8;
  box-shadow: 0 0 0 3px rgba(0,229,200,.18);
  transform: translateY(-1px);
}
.btnPrimary:focus-visible,
.btnNav:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
}

/* Hero-size primary */
.heroCtas .btnPrimary,
.bottomCtas .btnPrimary,
.boardActionRow > .btnPrimary {
  padding: 14px var(--s7);
  font-size: 13px;
}

/* Secondary */
.btnSecondary {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border-hi);
  padding: 14px var(--s7);
}
.btnSecondary:hover {
  background: rgba(255,255,255,.04);
  border-color: rgba(255,255,255,.22);
  color: var(--text);
}
.btnSecondary:focus-visible {
  outline: 2px solid rgba(255,255,255,.4);
  outline-offset: 3px;
}

/* Board-card secondary (smaller) */
.boardActionRow .btnSecondary {
  padding: 8px var(--s2);
  font-size: 11px;
}

/* Ghost */
.btnGhost {
  background: transparent;
  color: var(--dim);
  border: none;
  padding: 6px var(--s1);
  font-size: 11px;
}
.btnGhost:hover { color: var(--muted); }

/* Run button */
.btnRun {
  border: 1px solid rgba(0,229,200,.25);
  color: var(--cyan);
  background: transparent;
  padding: 7px var(--s3);
}
.btnRun:hover {
  background: var(--cyan-dim);
  border-color: var(--cyan-mid);
}

@media (prefers-reduced-motion: reduce) {
  .btnNav, .btnPrimary, .btnSecondary, .btnGhost, .btnRun {
    transition: none;
    transform: none !important;
  }
}

/* ── Hero ──────────────────────────────────────────────────── */
/* vNext canonical */
.hero {
  min-height: unset;
  display: block;
  padding: 86px var(--s7) 28px;
  text-align: left;
  position: relative;
  overflow: hidden;
}

.heroGrid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,229,200,.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,229,200,.018) 1px, transparent 1px);
  background-size: 64px 64px;
  pointer-events: none;
}

@keyframes gridDrift {
  from { background-position: 0 0; }
  to   { background-position: 0 64px; }
}

@media (prefers-reduced-motion: no-preference) {
  .heroGrid { animation: gridDrift 28s linear infinite; }
}

.heroGlow {
  position: absolute;
  width: 680px; height: 280px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0,229,200,.055), transparent 70%);
  top: 60px; left: -60px;
  pointer-events: none;
}

.heroShell {
  position: relative;
  z-index: 2;
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.1fr .9fr;
  gap: var(--s4);
  align-items: start;
}

.badge {
  display: inline-flex;
  gap: var(--s1);
  align-items: center;
  border: 1px solid rgba(0,229,200,.28);
  padding: 5px 13px;
  margin-bottom: var(--s5);
  font-size: 11px;
  color: var(--cyan);
  font-family: var(--font-dm-mono), monospace;
  letter-spacing: .04em;
  border-radius: var(--r1);
}
.badgeDot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--cyan);
  flex-shrink: 0;
}

.heroCopy h1 {
  font-size: 68px;
  line-height: .93;
  margin: 14px 0 var(--s2);
  max-width: 640px;
}

.heroSub {
  font-size: 16px;
  color: var(--muted);
  max-width: 540px;
  margin: 0 0 var(--s4);
  line-height: 1.6;
}

.heroReturn {
  font-family: var(--font-dm-mono), monospace;
  font-size: 11px;
  color: var(--cyan);
  display: none;
}
.heroReturn.visible, .visible { display: block; }

.heroCtas {
  display: flex;
  flex-direction: column;
  gap: var(--s2);
  align-items: flex-start;
}
.heroCtasRow {
  display: flex;
  gap: var(--s2);
  flex-wrap: wrap;
  justify-content: flex-start;
}

.heroMicro {
  font-size: 11px;
  color: var(--muted);
  margin: 0;
  font-family: var(--font-dm-mono), monospace;
}

.modeChip {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 4px 10px;
  border: 1px solid var(--border);
  font-size: 11px;
  font-family: var(--font-dm-mono), monospace;
  border-radius: var(--r1);
}
.modeChipReason { opacity: .7; }

.heroProofColumn {
  display: grid;
  gap: var(--s2);
}

.scrollHint {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--dim);
  font-size: 11px;
}

/* ── Hero sim widgets ──────────────────────────────────────── */
.heroSim {
  width: 100%;
  max-width: 640px;
  margin-top: var(--s6);
}
.heroSimLabel {
  font-size: 10px;
  color: var(--muted);
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.heroSimLabel span { color: var(--cyan); }
.simSliderRow {
  display: flex;
  align-items: center;
  gap: var(--s2);
  margin-bottom: var(--s2);
}
.simSlider { flex: 1; }
.simSliderVal {
  font-family: var(--font-dm-mono), monospace;
  color: var(--cyan);
  font-size: 12px;
  min-width: 40px;
}
.simCanvasWrap {
  height: 72px;
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: var(--r1);
}
.simCanvasWrap canvas { width: 100%; height: 72px; }
.simVerdict {
  font-family: var(--font-dm-mono), monospace;
  font-size: 10px;
  color: var(--muted);
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}
.svHit  { color: var(--cyan); }
.svRisk { color: var(--yellow); }

/* ── Stats compact (hero sidebar) ──────────────────────────── */
.statsSection {
  max-width: 1040px;
  margin: 0 auto;
  padding: var(--s3) var(--s7);
}
.statsBarCompact {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: var(--s1);
}
.statsBarCompact .statCell {
  padding: var(--s2) var(--s2);
  border: 1px solid var(--border);
  background: var(--bg3);
  border-radius: var(--r1);
}
.statVal {
  font-size: 40px;
  line-height: 1;
  font-family: var(--font-barlow-condensed), sans-serif;
  text-transform: uppercase;
}
.statVal span { color: var(--cyan); }
.statLabel {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: .06em;
  text-transform: uppercase;
}
.statCaption {
  font-size: 11px;
  color: var(--muted);
  margin: 4px 0 2px;
  line-height: 1.35;
}
.statBarFill {
  position: absolute;
  left: 0; bottom: 0;
  height: 2px;
  background: var(--cyan);
  transition: width 1.4s;
}

/* Legacy stats bar (full-width, hidden by vNext) */
.statsBar {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  border-bottom: 1px solid var(--border);
}
.statCell {
  padding: var(--s5);
  position: relative;
  border-right: 1px solid var(--border);
}

/* ── Proof strip ───────────────────────────────────────────── */
.proofStrip {
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}
.proofTrack {
  display: flex;
  width: max-content;
}
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: no-preference) {
  .proofTrack { animation: marquee 24s linear infinite; }
}
.proofChip {
  display: inline-flex;
  gap: var(--s1);
  padding: 13px 26px;
  border-right: 1px solid var(--border);
  font-size: 12px;
  align-items: center;
}
.dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--cyan);
}
.proofStack { display: grid; gap: 0; }

/* ── How It Works inline ───────────────────────────────────── */
.howItWorksInline {
  max-width: 1120px;
  margin: 0 auto;
  padding: var(--s4) var(--s7);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s2);
  border-bottom: 1px solid var(--border);
}
.howStep {
  display: flex;
  gap: var(--s2);
  padding: var(--s2) var(--s2);
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: var(--r1);
  transition: border-color .2s;
}
.howStep:hover { border-color: var(--border-hi); }
.howStep h3 {
  font-size: 14px;
  margin: 0 0 4px;
  text-transform: none;
  font-family: var(--font-barlow), sans-serif;
}
.howStep p {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}
.howIcon {
  width: 24px; height: 24px;
  flex-shrink: 0;
  border: 1px solid rgba(0,229,200,.3);
  color: var(--cyan);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-dm-mono), monospace;
  font-size: 11px;
}

/* ── Lifecycle Tabs ────────────────────────────────────────── */
.lifecycleTabsSection {
  padding: 8px var(--s7) 12px;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
}
.lifecycleTabs {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  gap: var(--s1);
  flex-wrap: wrap;
}
.lifecycleTab {
  font-family: var(--font-dm-mono), monospace;
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 7px 13px;
  font-size: 12px;
  cursor: pointer;
  border-radius: var(--r1);
  transition: background .18s, border-color .18s, color .18s;
}
.lifecycleTab:hover { color: var(--text); border-color: var(--border-hi); }
.lifecycleTabActive,
.lifecycleTab.active {
  color: var(--cyan);
  border-color: rgba(0,229,200,.35);
  background: rgba(0,229,200,.07);
}

/* ── Phase/Postmortem cards ────────────────────────────────── */
.phaseStack { display: grid; gap: 0; }
.phaseLinkSection, .postmortemSection {
  padding: var(--s5) var(--s7);
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
}
.phaseLinkCard, .postmortemCard {
  max-width: 1040px;
  margin: 0 auto;
  border: 1px solid var(--border);
  background: var(--card);
  padding: var(--s4);
  border-radius: var(--r1);
  transition: border-color .2s;
}
.phaseLinkCard:hover, .postmortemCard:hover { border-color: var(--border-hi); }
.phaseLinkCard h3, .postmortemCard h3 {
  font-size: 28px;
  margin: var(--s1) 0 var(--s2);
}
.phaseLinkCard p, .postmortemCard p {
  font-size: 13px;
  color: var(--muted);
  margin: 0 0 var(--s3);
  line-height: 1.55;
}
.postmortemInner { max-width: 1040px; margin: 0 auto; }
.postmortemHeader {
  display: flex;
  justify-content: space-between;
  gap: var(--s1);
  align-items: center;
  margin-bottom: var(--s1);
}
.previewBadge {
  font-family: var(--font-dm-mono), monospace;
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid rgba(245,197,66,.45);
  color: var(--yellow);
  border-radius: var(--r1);
}
.postmortemActions {
  display: flex;
  align-items: center;
  gap: var(--s2);
  flex-wrap: wrap;
}
.postmortemHint {
  font-size: 11px;
  color: var(--muted);
  font-family: var(--font-dm-mono), monospace;
}
.capabilityChips {
  display: flex;
  gap: var(--s1);
  flex-wrap: wrap;
  margin-top: var(--s1);
}
.capabilityChip {
  font-family: var(--font-dm-mono), monospace;
  font-size: 11px;
  border: 1px solid var(--border);
  background: var(--bg3);
  padding: 4px 9px;
  color: var(--text);
  border-radius: var(--r1);
}

/* ── Tonight's Board (primary artifact) ────────────────────── */
.boardSection {
  padding: var(--s5) var(--s7) var(--s6);
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
}
.boardInner {
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  gap: var(--s4);
}
.boardHeader {
  display: flex;
  justify-content: space-between;
  gap: var(--s2);
  align-items: flex-start;
}
.boardHeader h2 {
  font-size: 32px;
  margin: 4px 0 var(--s1);
  letter-spacing: .02em;
}

.sectionLabel {
  font-family: var(--font-dm-mono), monospace;
  font-size: 10px;
  letter-spacing: .12em;
  color: var(--cyan);
  margin-bottom: var(--s2);
  text-transform: uppercase;
}
.sectionCaption {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
  max-width: 400px;
}

.boardCardsGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: var(--s2);
}

/* ── Board artifact card ────────────────────────────────────── */
.boardArtifactCard {
  border: 1px solid rgba(255,255,255,.10);
  background: linear-gradient(160deg, rgba(14,20,30,.9), rgba(9,12,18,.98));
  padding: var(--s3);
  display: grid;
  gap: var(--s2);
  box-shadow: var(--shadow-card);
  border-radius: var(--r2);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
  position: relative;
}
.boardArtifactCard::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--r2);
  border-top: 1px solid rgba(255,255,255,.09);
  pointer-events: none;
}
.boardArtifactCard:hover {
  transform: translateY(-3px);
  border-color: rgba(0,229,200,.32);
  box-shadow: var(--shadow-hover);
}
.boardArtifactCard:focus-within {
  outline: 2px solid rgba(0,229,200,.5);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .boardArtifactCard { transition: border-color .18s; }
  .boardArtifactCard:hover { transform: none; }
}

.boardArtifactHeader {
  display: flex;
  justify-content: space-between;
  gap: var(--s2);
  align-items: center;
}
.boardMatchup {
  margin: 0;
  font-size: 10px;
  font-family: var(--font-dm-mono), monospace;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .08em;
}
.boardBadge {
  font-family: var(--font-dm-mono), monospace;
  font-size: 10px;
  color: var(--muted);
  border: 1px solid var(--border);
  background: rgba(255,255,255,.02);
  padding: 2px 7px;
  border-radius: 3px;
  flex-shrink: 0;
}
.boardPropHeadline {
  margin: 0;
  font-size: 18px;
  line-height: 1.18;
  letter-spacing: .01em;
  font-family: var(--font-barlow-condensed), sans-serif;
  text-transform: uppercase;
}
.boardMonoSubline {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  font-family: var(--font-dm-mono), monospace;
  line-height: 1.4;
  opacity: .9;
}

.boardSignalRow {
  display: flex;
  justify-content: space-between;
  gap: var(--s1);
  flex-wrap: wrap;
  align-items: center;
  padding: 6px 0;
  border-top: 1px solid rgba(255,255,255,.05);
}
.boardHitPill {
  font-size: 11px;
  padding: 3px 8px;
  border: 1px solid rgba(0,229,200,.35);
  color: var(--cyan);
  background: rgba(0,229,200,.07);
  font-family: var(--font-dm-mono), monospace;
  border-radius: 3px;
  font-weight: 600;
}
.boardRecency {
  font-size: 11px;
  color: var(--muted);
  font-family: var(--font-dm-mono), monospace;
}

.boardReasonList {
  margin: 0;
  padding-left: 16px;
  color: #b8c8d8;
  font-size: 12px;
  line-height: 1.45;
  display: grid;
  gap: 3px;
}

.boardUncertaintyBand {
  margin: 0;
  padding: 7px 9px;
  border: 1px solid rgba(245,197,66,.22);
  background: rgba(245,197,66,.05);
  font-size: 11px;
  color: #cdc082;
  border-radius: 3px;
  font-family: var(--font-dm-mono), monospace;
}

.boardSources {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
  font-family: var(--font-dm-mono), monospace;
  opacity: .8;
}

.boardActionRow {
  display: flex;
  gap: var(--s1);
  flex-wrap: wrap;
  padding-top: var(--s1);
  border-top: 1px solid rgba(255,255,255,.07);
  margin-top: 2px;
}

/* ── Board skeletons ───────────────────────────────────────── */
.boardSkeletonGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: var(--s2);
}
.boardSkeletonCard {
  border: 1px solid var(--border);
  background: var(--card);
  padding: var(--s2);
  display: grid;
  gap: var(--s1);
  border-radius: var(--r2);
}
.skeleton {
  display: inline-block;
  background: rgba(255,255,255,.05);
  border-radius: 3px;
}

/* ── Board disclosure ──────────────────────────────────────── */
.boardDisclosureSection {
  padding: 0 var(--s7) var(--s4);
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
}
.boardDisclosure {
  max-width: 1120px;
  margin: 0 auto;
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: var(--r1);
}
.boardDisclosure summary {
  cursor: pointer;
  list-style: none;
  padding: var(--s2) var(--s3);
  font-family: var(--font-dm-mono), monospace;
  font-size: 12px;
  color: var(--muted);
  transition: color .18s;
}
.boardDisclosure summary:hover { color: var(--text); }
.boardDisclosure summary::-webkit-details-marker { display: none; }
.boardDisclosure[open] summary { border-bottom: 1px solid var(--border); color: var(--text); }
.boardDisclosure .gaugeSection,
.boardDisclosure .trackerSection {
  padding: var(--s4);
  border-bottom: none;
}

/* ── Shared section shell ──────────────────────────────────── */
.snapshotSection, .gaugeSection, .oddsSection,
.trackerSection, .verdictSection, .faqSection {
  padding: var(--s6) var(--s7);
  border-bottom: 1px solid var(--border);
}
.snapshotInner, .oddsInner, .faqInner {
  max-width: 1040px;
  margin: 0 auto;
}

/* ── Snapshot ──────────────────────────────────────────────── */
.snapshotCompact, .statsCompact {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: var(--r1);
}
.statsCompact { padding: var(--s2); }

.snapshotToast {
  padding: 9px 14px;
  border: 1px solid var(--border);
  margin-bottom: var(--s3);
  border-radius: var(--r1);
  font-size: 12px;
}
.toastDot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--yellow);
  display: inline-block;
  margin-right: var(--s1);
}
.live .toastDot { background: var(--cyan); }

.snapshotCard, .gaugeWidget, .trackerCard, .verdictCard {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r1);
}
.snapshotHeader, .trackerCardHeader, .verdictCardHeader {
  background: #0a0e16;
  border-bottom: 1px solid var(--border);
  padding: var(--s2) var(--s3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modeBadge {
  font-family: var(--font-dm-mono), monospace;
  font-size: 10px;
  padding: 2px 8px;
  border: 1px solid;
  border-radius: 3px;
}
.demo { color: var(--yellow); }
.live { color: var(--cyan); }

.snapshotBody { padding: var(--s3); }
.providerChips { display: flex; gap: var(--s1); margin-bottom: var(--s3); }
.providerChip {
  padding: 3px 9px;
  border: 1px solid;
  border-radius: 3px;
  font-size: 11px;
  font-family: var(--font-dm-mono), monospace;
}
.providerChip.ok   { color: var(--cyan); }
.providerChip.warn { color: var(--yellow); }

.snapshotRow {
  display: flex;
  justify-content: space-between;
  padding: 9px;
  border: 1px solid rgba(255,255,255,.04);
  margin-bottom: var(--s1);
  font-size: 12px;
  border-radius: var(--r1);
}
.snapshotCta {
  width: 100%;
  padding: var(--s2) var(--s3);
  background: rgba(0,229,200,.04);
  color: var(--cyan);
  border: 1px solid rgba(0,229,200,.18);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  cursor: pointer;
  transition: background .18s;
  border-radius: var(--r1);
}
.snapshotCta:hover { background: rgba(0,229,200,.08); }

/* ── Gauge ─────────────────────────────────────────────────── */
.gaugeSection, .trackerSection, .verdictSection, .faqSection { background: var(--bg2); }
.gaugeInner, .trackerInner, .verdictInner {
  max-width: 1040px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s5);
}
.gaugePct {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 34px;
  font-family: var(--font-barlow-condensed), sans-serif;
}
.gaugeArcWrap { position: relative; display: flex; justify-content: center; }
.gaugeLegRow { display: flex; gap: var(--s2); padding: var(--s1) 4px; }
.gaugeLegBarWrap { width: 80px; height: 4px; background: var(--border); border-radius: 2px; }
.gaugeLegBar { height: 100%; border-radius: 2px; }
.gaugeTooltip {
  margin-top: var(--s3);
  padding: var(--s2);
  border: 1px solid rgba(0,229,200,.14);
  border-radius: var(--r1);
  font-size: 12px;
}

/* ── Odds ──────────────────────────────────────────────────── */
.oddsHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--s2); }
.oddsTabs { display: flex; gap: 2px; }
.oddsTab {
  font-family: var(--font-dm-mono), monospace;
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
  padding: 5px 11px;
  font-size: 11px;
  cursor: pointer;
  border-radius: var(--r1);
  transition: background .18s, color .18s;
}
.oddsTab.active, .oddsTab:focus-visible { color: var(--cyan); background: var(--cyan-dim); }
.oddsChartWrap { height: 160px; border: 1px solid var(--border); border-radius: var(--r1); }
.oddsChartWrap canvas { width: 100%; height: 160px; }
.oddsAnnotations { display: flex; gap: var(--s5); margin-top: var(--s3); }
.oddsAnn { font-size: 10px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
.annDot { width: 8px; height: 3px; border-radius: 2px; }
.active { color: var(--cyan); background: rgba(0,229,200,.08); }

/* ── Tracker ───────────────────────────────────────────────── */
.stepsList, .legList { padding: var(--s3); }
.stepRow { display: flex; gap: var(--s2); padding: var(--s2) 0; }
.stepIcon {
  width: 22px; height: 22px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid;
  flex-shrink: 0;
  font-size: 10px;
}
.stepContent { flex: 1; }
.stepLabel { font-size: 12px; }
.stepDetail { max-height: 0; opacity: 0; overflow: hidden; transition: max-height .25s, opacity .2s; }
.stepDetail.visible { max-height: 60px; opacity: 1; }
.eventFeed { border-top: 1px solid var(--border); padding: var(--s2) var(--s3); min-height: 80px; }
.eventName { color: var(--cyan); }
.eventAgent { color: var(--dim); }
.trackerFooter {
  border-top: 1px solid var(--border);
  padding: var(--s2) var(--s3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* ── Verdict ───────────────────────────────────────────────── */
.verdictCard .legRow {
  display: flex;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px solid rgba(255,255,255,.03);
  font-size: 13px;
}
.riskBadge {
  background: rgba(245,197,66,.1);
  color: var(--yellow);
  padding: 3px 9px;
  border-radius: 3px;
  font-size: 11px;
}

/* ── Pillars ───────────────────────────────────────────────── */
.pillars {
  padding: var(--s7) var(--s7);
  max-width: 1200px;
  margin: 0 auto;
}
.sectionHeading {
  font-size: 38px;
  margin: 0 0 var(--s6);
}
.pillarsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
}
.pillar {
  background: var(--card);
  padding: var(--s6) var(--s5);
  transition: background .2s;
}
.pillar:hover { background: #0c1019; }
.pillarNum { font-size: 10px; color: var(--dim); margin-bottom: var(--s1); }

/* ── Not Section ───────────────────────────────────────────── */
.notSection {
  padding: var(--s7) var(--s7);
  max-width: 860px;
  margin: 0 auto;
  text-align: center;
}
.notSection p { color: var(--muted); margin: var(--s1) 0 0; font-size: 14px; }

/* ── FAQ ───────────────────────────────────────────────────── */
.faqItem {
  border-bottom: 1px solid var(--border);
  padding: var(--s5) 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s6);
}
.faqQ { font-style: italic; color: var(--muted); font-size: 14px; }
.faqA { font-family: var(--font-dm-mono), monospace; font-size: 12px; line-height: 1.55; }

/* ── Bottom CTA ────────────────────────────────────────────── */
.bottomCta {
  padding: var(--s8) var(--s7) 72px;
  text-align: center;
  position: relative;
}
.bottomGlow {
  position: absolute;
  left: 50%; top: 50%;
  width: 560px; height: 240px;
  transform: translate(-50%,-50%);
  background: radial-gradient(ellipse, rgba(0,229,200,.05), transparent 70%);
  pointer-events: none;
}
.bottomCtas {
  display: flex;
  gap: var(--s2);
  justify-content: center;
  flex-wrap: wrap;
  margin-top: var(--s5);
}
/* Bottom CTA primary size */
.bottomCtas .btnPrimary {
  padding: 16px var(--s8);
  font-size: 14px;
}

/* ── Sticky Bar ────────────────────────────────────────────── */
.stickyBar {
  position: fixed;
  left: var(--s3); right: var(--s3); bottom: var(--s3);
  z-index: 320;
  background: rgba(10,13,19,.97);
  border: 1px solid var(--border-hi);
  border-radius: var(--r2);
  padding: var(--s2) var(--s3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--s2);
  transform: translateY(120%);
  transition: transform .24s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0,0,0,.5);
}
.stickyVisible { transform: translateY(0); }
.stickyMode {
  font-size: 11px;
  color: var(--muted);
  font-family: var(--font-dm-mono), monospace;
  line-height: 1.4;
}
.stickyReason { opacity: .75; }
.stickyActions { display: flex; gap: var(--s1); }

/* ── Footer ────────────────────────────────────────────────── */
.footer {
  border-top: 1px solid var(--border);
  padding: var(--s4) var(--s7);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footerLogo {
  font-family: var(--font-barlow-condensed), sans-serif;
  color: var(--dim);
  font-size: 14px;
}
.footerNote {
  font-family: var(--font-dm-mono), monospace;
  font-size: 10px;
  color: var(--dim);
}

/* ── Misc tokens ───────────────────────────────────────────── */
.neutral { color: var(--text); }
.reasonHelp {
  margin-left: var(--s1);
  color: var(--muted);
  font-size: 12px;
  cursor: help;
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 960px) {
  .nav ul { display: none; }
  .gaugeInner, .trackerInner, .verdictInner,
  .pillarsGrid, .statsBar, .faqItem {
    grid-template-columns: 1fr;
  }
  .hero { padding-top: 78px; }
  .heroShell { grid-template-columns: 1fr; gap: var(--s3); }
  .heroCopy h1 { font-size: 44px; }
  .howItWorksInline { grid-template-columns: 1fr; padding-left: 20px; padding-right: 20px; }
  .boardSection, .boardDisclosureSection { padding-left: 20px; padding-right: 20px; }
  .boardCardsGrid, .boardSkeletonGrid { grid-template-columns: 1fr; }
  .boardHeader { flex-direction: column; }
  .stickyBar { left: var(--s1); right: var(--s1); bottom: var(--s1); flex-direction: column; align-items: stretch; }
  .stickyActions { justify-content: stretch; }
  .stickyActions a { flex: 1; text-align: center; }
}

@media (min-width: 961px) {
  .stickyBar { display: none; }
}

@media (max-width: 600px) {
  .nav { padding: var(--s2) 20px; }
  .hero,
  .snapshotSection, .trackerSection, .pillars,
  .verdictSection, .gaugeSection, .oddsSection,
  .notSection, .faqSection, .bottomCta, .footer {
    padding-left: 20px;
    padding-right: 20px;
  }
  .hero { padding-left: 20px; padding-right: 20px; padding-bottom: var(--s3); }
  .heroCopy h1 { font-size: 38px; }
  .lifecycleTabsSection, .phaseLinkSection, .postmortemSection {
    padding-left: 20px;
    padding-right: 20px;
  }
  .heroCtas .btnPrimary, .bottomCtas .btnPrimary {
    padding: 13px var(--s6);
  }
}
