export const complianceText = {
  outperforming: 'Historically this segment is outperforming baseline ROI.',
  lowWinRate: 'Observed win rate is below the working threshold; treat confidence inputs as unstable.',
  pendingBacklog: 'Pending tickets exceed settled outcomes, reducing feedback-loop clarity.',
  smallSample: 'Sample size is still small; continue logging outcomes for stronger clarity.',
};

export const prohibitedPhrases = ['size stakes higher', 'avoid this', 'bet bigger', 'you should bet'];

export const isPolicyCompliant = (text: string): boolean => !prohibitedPhrases.some((phrase) => text.toLowerCase().includes(phrase));
