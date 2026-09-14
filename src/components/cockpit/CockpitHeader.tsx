'use client';

import type { ReactNode } from 'react';

import {
  LiveNervousSystemStrip,
  type LiveNervousSystemStripProps
} from '@/src/components/nervous/LiveNervousSystemStrip';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { getTruthModeCopy } from '@/src/core/ui/truthPresentation';

export function CockpitHeader({
  title,
  purpose,
  ctas,
  strip
}: {
  title: string;
  purpose: string;
  ctas?: ReactNode;
  strip: LiveNervousSystemStripProps;
}) {
  const nervous = useNervousSystem();
  const modeCopy = getTruthModeCopy({
    mode: strip.mode,
    reason: strip.reason,
    intentMode: strip.intentMode
  });

  return (
    <header className="cockpit-runtime-header">
      <p className="sr-only">{purpose}</p>
      <div className="cockpit-brand-row">
        <div className="cockpit-brand-lockup">
          <span className="cockpit-brand-mark" aria-hidden>
            R
          </span>
          <div>
            <p className="cockpit-brand-name">ResearchBets</p>
            <p className="cockpit-brand-purpose">{title}</p>
          </div>
        </div>
        {ctas ? <div className="cockpit-header-ctas">{ctas}</div> : null}
      </div>

      <div className="cockpit-runtime-summary" title={purpose}>
        <span className={`cockpit-status-dot mode-${strip.mode}`} aria-hidden />
        <span className="cockpit-runtime-mode" title={modeCopy.detail}>
          {modeCopy.label}
        </span>
        <span className="cockpit-runtime-divider" aria-hidden />
        <span>{nervous.sport}</span>
        <span>{nervous.date}</span>
        <span className="cockpit-runtime-tz">{nervous.tz}</span>
      </div>

      <div className="cockpit-runtime-expanded">
        <LiveNervousSystemStrip {...strip} />
      </div>
    </header>
  );
}
