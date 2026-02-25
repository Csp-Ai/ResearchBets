import { NextResponse } from 'next/server';

const includesAny = (value: string, terms: string[]) => terms.some((term) => value.toLowerCase().includes(term));

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { legs?: Array<{ selection?: string; riskFlags?: string[] }>; outcome?: 'win' | 'loss' | 'push' };
  const legs = Array.isArray(body.legs) ? body.legs : [];
  const outcome = body.outcome ?? 'loss';

  const joined = legs.map((leg) => `${leg.selection ?? ''} ${(leg.riskFlags ?? []).join(' ')}`).join(' | ');

  const classification = {
    process: outcome === 'loss' && legs.length >= 2 ? 'Good process / bad variance' : 'Good process / expected outcome',
    correlationMiss: includesAny(joined, ['same game', 'assist', 'points']) && legs.length >= 3,
    injuryImpact: includesAny(joined, ['injury', 'questionable', 'out']),
    lineValueMiss: outcome === 'loss' && includesAny(joined, ['line moved', 'steam', 'drift'])
  };

  return NextResponse.json({
    ok: true,
    classification,
    notes: [
      classification.correlationMiss ? 'Multiple legs depend on shared game script; correlation likely amplified variance.' : 'No major correlation concentration detected.',
      classification.injuryImpact ? 'Injury context likely changed rotation or usage.' : 'No explicit injury shock detected in provided legs.',
      classification.lineValueMiss ? 'Late line movement suggests weaker entry price.' : 'No obvious line value miss in deterministic check.'
    ]
  });
}
