import type { StoredBet } from './runtimeStore';
import { complianceText } from '../policy/text';

const confidenceBucket = (value: number): string => {
  const pct = value * 100;
  if (pct < 50) return '0-50';
  if (pct < 65) return '50-65';
  if (pct < 80) return '65-80';
  return '80-100';
};

export const summarizeBets = (bets: StoredBet[]) => {
  const settled = bets.filter((bet) => bet.status === 'settled');
  const stake = settled.reduce((sum, bet) => sum + bet.stake, 0);
  const profit = settled.reduce((sum, bet) => sum + (bet.settledProfit ?? 0), 0);
  const wins = settled.filter((bet) => bet.outcome === 'won').length;
  const roi = stake === 0 ? 0 : (profit / stake) * 100;
  const winRate = settled.length === 0 ? 0 : (wins / settled.length) * 100;

  const byBucket = settled.reduce<Record<string, { count: number; roi: number }>>((acc, bet) => {
    const key = confidenceBucket(bet.confidence);
    const prev = acc[key] ?? { count: 0, roi: 0 };
    const newCount = prev.count + 1;
    acc[key] = {
      count: newCount,
      roi: Number(((prev.roi * prev.count + ((bet.settledProfit ?? 0) / bet.stake) * 100) / newCount).toFixed(2)),
    };
    return acc;
  }, {});

  return {
    settledCount: settled.length,
    pendingCount: bets.filter((bet) => bet.status === 'pending').length,
    roi: Number(roi.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    winRate: Number(winRate.toFixed(2)),
    avgOdds: settled.length === 0 ? 0 : Number((settled.reduce((sum, b) => sum + b.odds, 0) / settled.length).toFixed(2)),
    byBucket,
  };
};

export const buildInsights = (bets: StoredBet[]): string[] => {
  const summary = summarizeBets(bets);
  const insights: string[] = [];
  if (summary.byBucket['80-100']?.roi && summary.byBucket['80-100'].roi > summary.roi) {
    insights.push(complianceText.outperforming);
  }
  if (summary.winRate < 45 && summary.settledCount >= 4) {
    insights.push(complianceText.lowWinRate);
  }
  if (summary.pendingCount > summary.settledCount) {
    insights.push(complianceText.pendingBacklog);
  }
  if (insights.length === 0) {
    insights.push(complianceText.smallSample);
  }
  return insights.slice(0, 6);
};
