'use client';

import Link from 'next/link';

import type { CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';

type PreviewStripProps = {
  rows: readonly CockpitBoardLeg[];
  statusLabel: string;
  buildHref: string;
  pasteHref: string;
  onPaste: () => void;
};

const compactMarket = (market: string) => market.toUpperCase().replace('POINTS', 'PTS').replace('ASSISTS', 'AST').replace('REBOUNDS', 'REB');

export function PreviewStrip({ rows, statusLabel, buildHref, pasteHref, onPaste }: PreviewStripProps) {
  const pills = rows.slice(0, 6);

  return (
    <div className="preview-strip" data-testid="preview-strip">
      <p className="preview-strip-label">Tonight&apos;s Board Preview</p>
      <div className="preview-strip-pills" aria-label="Board preview rows">
        {pills.map((row) => (
          <span key={row.id} className="preview-pill" title={`${row.player} ${row.market} ${row.line}`}>
            {row.player} {compactMarket(row.market)} {row.line}
          </span>
        ))}
      </div>
      <span className="preview-strip-status">{statusLabel}</span>
      <div className="preview-strip-actions">
        <Link href={buildHref} className="btn-secondary btn-mini">Build from Board</Link>
        <button type="button" className="btn-secondary btn-mini" onClick={onPaste} data-href={pasteHref}>Paste slip</button>
      </div>
    </div>
  );
}
