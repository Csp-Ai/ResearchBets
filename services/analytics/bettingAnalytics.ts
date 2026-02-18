import { z } from 'zod';
import type { Bet } from '../../entities/bet/model';

export const performanceMetricsSchema = z.object({
  totalBets: z.number().int().nonnegative(),
  totalWins: z.number().int().nonnegative(),
  totalLosses: z.number().int().nonnegative(),
  totalPushes: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(1),
  roi: z.number(), // percentage
  totalStaked: z.number().nonnegative(),
  totalReturned: z.number().nonnegative(),
  netProfit: z.number(),
  avgOdds: z.number(),
  avgStake: z.number(),
  stdDevStake: z.number(),
  largestWin: z.number().nonnegative(),
  largestLoss: z.number().nonnegative(),
  maxConsecutiveWins: z.number().int().nonnegative(),
  maxConsecutiveLosses: z.number().int().nonnegative(),
  expectedValue: z.number(),
});

export type PerformanceMetrics = z.infer<typeof performanceMetricsSchema>;

export const edgeReportSchema = z.object({
  metric: z.string().min(1),
  cohort: z.string().min(1),
  avgClvPct: z.number(),
  medianClvPct: z.number(),
  sampleSize: z.number().int().nonnegative(),
  stdDevClvPct: z.number(),
  percentagePositiveClv: z.number().min(0).max(1),
});

export type EdgeReport = z.infer<typeof edgeReportSchema>;

export class BettingAnalytics {
  /**
   * Calculate comprehensive performance metrics from bet history
   */
  calculateMetrics(bets: Bet[]): PerformanceMetrics {
    const settledBets = bets.filter((b) => b.status === 'settled');

    const wins = settledBets.filter((b) => b.outcome === 'won');
    const losses = settledBets.filter((b) => b.outcome === 'lost');
    const pushes = settledBets.filter((b) => b.outcome === 'push');

    const totalStaked = bets.reduce((sum, b) => sum + b.stake, 0);
    const totalReturned = settledBets.reduce((sum, b) => {
      if (b.outcome === 'won') return sum + b.potentialPayout;
      if (b.outcome === 'push') return sum + b.stake;
      return sum;
    }, 0);

    const netProfit = totalReturned - totalStaked;
    const roi = totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0;
    const winRate = settledBets.length > 0 ? wins.length / settledBets.length : 0;

    const stakes = bets.map((b) => b.stake);
    const avgStake = stakes.reduce((a, b) => a + b, 0) / bets.length || 0;
    const variance =
      stakes.reduce((sum, s) => sum + Math.pow(s - avgStake, 2), 0) / stakes.length || 0;
    const stdDevStake = Math.sqrt(variance);

    const odds = bets.map((b) => {
      if (b.oddsAmerican > 0) {
        return b.oddsAmerican / 100 + 1;
      } else {
        return 100 / -b.oddsAmerican + 1;
      }
    });
    const avgOdds = odds.reduce((a, b) => a + b, 0) / odds.length || 0;

    const consecutiveStats = this.calculateConsecutiveWinsLosses(bets);

    // Expected value calculation (simplified)
    const expectedValue = bets.reduce((sum, b) => {
      const impliedProb =
        b.oddsAmerican > 0 ? 100 / (b.oddsAmerican + 100) : -b.oddsAmerican / (-b.oddsAmerican + 100);
      const expectedReturn = b.stake * impliedProb * (odds[bets.indexOf(b)]! - 1);
      return sum + expectedReturn;
    }, 0);

    return {
      totalBets: bets.length,
      totalWins: wins.length,
      totalLosses: losses.length,
      totalPushes: pushes.length,
      winRate,
      roi,
      totalStaked,
      totalReturned,
      netProfit,
      avgOdds,
      avgStake,
      stdDevStake,
      largestWin: wins.length > 0 ? Math.max(...wins.map((b) => b.potentialPayout - b.stake)) : 0,
      largestLoss: losses.length > 0 ? Math.max(...losses.map((b) => b.stake)) : 0,
      maxConsecutiveWins: consecutiveStats.maxWins,
      maxConsecutiveLosses: consecutiveStats.maxLosses,
      expectedValue,
    };
  }
  
  /**
   * Calculate Closing Line Value (CLV) - how odds have moved since bet placement
   */
  calculateClv(placedOdds: number, closingOdds: number): number {
    // CLV = (Closing Odds - Placed Odds) / Placed Odds * 100
    if (placedOdds === 0) return 0;
    return ((closingOdds - placedOdds) / placedOdds) * 100;
  }
  
  /**
   * Calculate edge percentage (how much you're getting versus fair odds)
   */
  calculateEdgePercentage(impliedProbability: number, winRate: number): number {
    if (impliedProbability === 0) return 0;
    return ((winRate - impliedProbability) / impliedProbability) * 100;
  }
  
  /**
   * Analyze performance by market type
   */
  analyzeByMarket(
    bets: Bet[],
    marketType: string
  ): PerformanceMetrics {
    const filteredBets = bets.filter((b) => b.market === marketType);
    return this.calculateMetrics(filteredBets);
  }
  
  /**
   * Analyze performance by sport
   */
  analyzeBySport(bets: Bet[], sport: string): PerformanceMetrics {
    const filteredBets = bets.filter((b) => b.sport === sport);
    return this.calculateMetrics(filteredBets);
  }
  
  /**
   * Detect variance from expected value
   */
  detectVarianceFromEv(
    bets: Bet[],
    actualProfit: number,
    expectedValue: number,
    stdDevThreshold: number = 2
  ): {
    variance: number;
    stdDevs: number;
    isOutlier: boolean;
    interpretation: string;
  } {
    const variance = actualProfit - expectedValue;
    const metrics = this.calculateMetrics(bets);
    const stdDev = Math.sqrt(
      bets.reduce((sum, b) => sum + Math.pow(b.stake, 2), 0) / bets.length
    );

    const stdDevs = stdDev > 0 ? variance / stdDev : 0;
    const isOutlier = Math.abs(stdDevs) > stdDevThreshold;

    let interpretation = 'Normal variance';
    if (stdDevs > stdDevThreshold) {
      interpretation = 'Positive variance - beating expected value';
    } else if (stdDevs < -stdDevThreshold) {
      interpretation = 'Negative variance - underperforming expected value';
    }

    return {
      variance,
      stdDevs,
      isOutlier,
      interpretation,
    };
  }
  
  /**
   * Calculate Sharpe ratio (risk-adjusted returns)
   */
  calculateSharpeRatio(bets: Bet[], riskFreeRate: number = 0.02): number {
    const settledBets = bets.filter((b) => b.status === 'settled');
    if (settledBets.length === 0) return 0;

    const returns = settledBets.map((b) => {
      if (b.outcome === 'won') return (b.potentialPayout - b.stake) / b.stake;
      if (b.outcome === 'push') return 0;
      return -1; // Total loss
    });

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;
    return (avgReturn - riskFreeRate) / stdDev;
  }
  
  /**
   * Identify streaks and their characteristics
   */
  private calculateConsecutiveWinsLosses(
    bets: Bet[]
  ): { maxWins: number; maxLosses: number } {
    const settledBets = bets.filter((b) => b.status === 'settled');
    let maxWins = 0,
      maxLosses = 0;
    let currentWins = 0,
      currentLosses = 0;

    for (const bet of settledBets) {
      if (bet.outcome === 'won') {
        currentWins++;
        currentLosses = 0;
        maxWins = Math.max(maxWins, currentWins);
      } else if (bet.outcome === 'lost') {
        currentLosses++;
        currentWins = 0;
        maxLosses = Math.max(maxLosses, currentLosses);
      }
    }

    return { maxWins, maxLosses };
  }
}