export function deterministicPropReasoning(input: {
  player: string;
  market: string;
  l10: number;
  edgeDelta: number;
  volatility: 'low' | 'med' | 'high';
}): string {
  const positive = input.l10 > 0.6 && input.edgeDelta > 0;
  if (input.volatility === 'high') {
    return `${input.player} ${input.market} shows a measurable edge, but recent swings are high-volatility, so stake sizing should stay conservative.`;
  }
  if (positive) {
    return `${input.player} ${input.market} is trending above baseline with a positive model edge versus market pricing, making this one of the steadier entries tonight.`;
  }
  return `${input.player} ${input.market} is playable in smaller size, but edge and consistency are mixed versus stronger board options.`;
}
