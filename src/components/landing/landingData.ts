export const GAUGE_LEGS = [
  { name: 'Brunson 27+ PTS', risk: 22, color: '#00e5c8', tip: 'Solid matchup. Home, rested, last 5 avg 29.2. <span class="hl">Low risk.</span>' },
  { name: 'Knicks ML', risk: 31, color: '#f5c542', tip: 'Overlaps with Brunson PTS. Correlated — both win or both lose. <span class="hl">Counts once.</span>' },
  { name: 'Haliburton 8+ AST', risk: 48, color: '#f5c542', tip: 'Limited practice today. Status questionable. <span class="hl">Injury watch.</span>' },
  { name: 'Tucker 3+ REB', risk: 72, color: '#ff4f5e', tip: 'Weakest leg. Inconsistent minutes. Low floor. <span class="hl">Consider cutting.</span>' }
] as const;

export const ODDS_DATA = {
  ML: {
    events: [
      { idx: 12, type: 'sharp', label: '-140 sharp move' },
      { idx: 28, type: 'injury', label: 'Injury report' },
      { idx: 41, type: 'sharp', label: '-125 reverse line' }
    ]
  },
  PTS: {
    events: [
      { idx: 8, type: 'sharp', label: 'Line moved -110→-115' },
      { idx: 35, type: 'injury', label: 'Load mgmt concern' }
    ]
  },
  AST: {
    events: [
      { idx: 18, type: 'injury', label: 'Practice limited' },
      { idx: 33, type: 'injury', label: 'Questionable tag' },
      { idx: 45, type: 'sharp', label: 'Sharp fade' }
    ]
  }
} as const;

export const TRACKER_STEPS = [
  { label: 'Parse slip', detail: '4 legs detected. Mapping player IDs to database.' },
  { label: 'Check injuries', detail: 'Haliburton: limited practice. Tucker: full.' },
  { label: 'Watch line movement', detail: 'Brunson 27+ moved from -110 to -115. Monitor.' },
  { label: 'Detect overlap', detail: 'Brunson PTS + Knicks ML flagged as correlated legs.' },
  { label: 'Generate verdict', detail: 'Risk 62%. Weakest leg: Tucker REB. Recommend cut.' }
] as const;

export const TRACKER_EVENTS = [
  { event_name: 'slip.parsed', agent_id: 'slip_parser' },
  { event_name: 'injury.flag', agent_id: 'injury_agent' },
  { event_name: 'line.move.detected', agent_id: 'line_watcher' },
  { event_name: 'correlation.warn', agent_id: 'overlap_agent' },
  { event_name: 'verdict.ready', agent_id: 'verdict_agent' }
] as const;
