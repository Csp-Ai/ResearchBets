'use client';

import Link from 'next/link';

type TicketEmptyCoachProps = {
  sampleHref: string;
};

export function TicketEmptyCoach({ sampleHref }: TicketEmptyCoachProps) {
  return (
    <div className="ticket-empty-coach" data-testid="ticket-empty-coach">
      <p>Add 2–4 legs to isolate pressure.</p>
      <div className="ticket-empty-steps">
        <span className="ticket-step-chip">Pick legs</span>
        <span className="ticket-step-chip">Run analysis</span>
        <span className="ticket-step-chip">Track outcomes</span>
      </div>
      <Link className="hero-tertiary" href={sampleHref}>Try sample slip</Link>
    </div>
  );
}
