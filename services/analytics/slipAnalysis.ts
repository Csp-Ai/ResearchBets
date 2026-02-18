import { z } from 'zod';

export const slipSelectionSchema = z.object({
  gameId: z.string().min(1),
  market: z.string().min(1),
  selection: z.string().min(1),
  odds: z.number().int(),
  line: z.number().nullable(),
  book: z.string().min(1),
});

export type SlipSelection = z.infer<typeof slipSelectionSchema>;

export const betSlipSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  selections: z.array(slipSelectionSchema).min(1),
  slipType: z.enum(['moneyline', 'parlay', 'teaser', 'system', 'custom']),
  totalOdds: z.number(),
  proposedStake: z.number().positive(),
  potentialPayout: z.number().positive(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  analysisStatus: z.enum(['pending', 'analyzing', 'complete', 'error']),
  createdAt: z.string().datetime(),
  analyzedAt: z.string().datetime().nullable(),
});

export type BetSlip = z.infer<typeof betSlipSchema>;

export const slipAnalysisResultSchema = z.object({
  slipId: z.string().uuid(),
  overallScore: z.number().min(0).max(100),
  recommendations: z.array(
    z.object({
      type: z.enum(['alert', 'suggestion', 'warning', 'info']),
      message: z.string().min(1),
      priority: z.enum(['low', 'medium', 'high']),
    })
  ),
  impliedProbabilityCheckResult: z.object({
    totalImpliedProb: z.number().min(0).max(2),
    interpretation: z.string().min(1),
    isOverround: z.boolean(),
  }),
  parlaySensitivity: z.object({
    breakEvenWinRate: z.number().min(0).max(1),
    volatilityLevel: z.enum(['low', 'medium', 'high']),
  }).nullable(),
  edgeAssessment: z.object({
    hasPositiveEdge: z.boolean(),
    estimatedEdgePct: z.number(),
    confidence: z.number().min(0).max(1),
  }).nullable(),
  createdAt: z.string().datetime(),
});

export type SlipAnalysisResult = z.infer<typeof slipAnalysisResultSchema>;

export class SlipAnalyzer {
  /**
   * Parse and validate a bet slip
   */
  createSlip(
    sessionId: string,
    selections: SlipSelection[],
    slipType: 'moneyline' | 'parlay' | 'teaser' | 'system' | 'custom',
    proposedStake: number
  ): BetSlip {
    const totalOdds = this.calculateTotalOdds(selections, slipType);
    const potentialPayout = proposedStake * totalOdds;

    const riskLevel = this.assessRiskLevel(proposedStake, totalOdds);

    return {
      id: this.generateUuid(),
      sessionId,
      selections,
      slipType,
      totalOdds,
      proposedStake,
      potentialPayout,
      riskLevel,
      analysisStatus: 'pending',
      createdAt: new Date().toISOString(),
      analyzedAt: null,
    };
  }

  /**
   * Analyze a bet slip comprehensively
   */
  analyze(slip: BetSlip): SlipAnalysisResult {
    const recommendations: Array<{
      type: 'alert' | 'suggestion' | 'warning' | 'info';
      message: string;
      priority: 'low' | 'medium' | 'high';
    }> = [];

    // Check for duplicate games
    const gameIds = slip.selections.map((s) => s.gameId);
    const uniqueGameIds = new Set(gameIds);
    if (gameIds.length !== uniqueGameIds.size && slip.slipType === 'parlay') {
      recommendations.push({
        type: 'warning',
        message: 'Multiple selections from the same game in parlay may violate sportsbook rules.',
        priority: 'high',
      });
    }

    // Implied probability check
    const impliedProbResult = this.checkImpliedProbability(slip.selections);
    if (impliedProbResult.isOverround) {
      recommendations.push({
        type: 'info',
        message: `Total implied probability is ${(impliedProbResult.totalImpliedProb * 100).toFixed(1)}% (overround detected).`,
        priority: 'low',
      });
    }

    // Risk assessment
    if (slip.potentialPayout / slip.proposedStake > 100) {
      recommendations.push({
        type: 'alert',
        message: 'Very high payout ratio (100:1 or greater). Ensure you understand the risk.',
        priority: 'high',
      });
    }

    // Parlay-specific analysis
    let parlaySensitivity = null;
    if (slip.slipType === 'parlay') {
      parlaySensitivity = this.analyzeParlayBreakeven(slip.selections);
      if (parlaySensitivity.breakEvenWinRate > 0.75) {
        recommendations.push({
          type: 'warning',
          message: `This parlay requires a ${(parlaySensitivity.breakEvenWinRate * 100).toFixed(1)}% win rate to break even. Consider reducing legs.`,
          priority: 'medium',
        });
      }
    }

    // Calculate overall score
    let overallScore = 50;
    if (impliedProbResult.totalImpliedProb > 1.05) overallScore -= 10;
    if (slip.potentialPayout / slip.proposedStake > 50) overallScore -= 10;
    overallScore = Math.max(0, Math.min(100, overallScore));

    return {
      slipId: slip.id,
      overallScore,
      recommendations,
      impliedProbabilityCheckResult: impliedProbResult,
      parlaySensitivity,
      edgeAssessment: null, // Would require historical data
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate total odds for a slip
   */
  private calculateTotalOdds(selections: SlipSelection[], slipType: string): number {
    const decimalOdds = selections.map((s) => this.americanToDecimal(s.odds));

    if (slipType === 'parlay') {
      return decimalOdds.reduce((a, b) => a * b, 1);
    } else if (slipType === 'teaser') {
      // Simplified: standard 6-point teaser adjustment
      return decimalOdds.map((o) => o * 0.9).reduce((a, b) => a * b, 1);
    }

    return decimalOdds.reduce((a, b) => a + b, 0) / decimalOdds.length;
  }

  /**
   * Convert American odds to decimal
   */
  private americanToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return americanOdds / 100 + 1;
    } else {
      return 100 / -americanOdds + 1;
    }
  }

  /**
   * Convert decimal odds to implied probability
   */
  private decimalToImpliedProb(decimalOdds: number): number {
    return 1 / decimalOdds;
  }

  /**
   * Check implied probability across all selections
   */
  private checkImpliedProbability(selections: SlipSelection[]): {
    totalImpliedProb: number;
    interpretation: string;
    isOverround: boolean;
  } {
    const impliedProbs = selections.map((s) => {
      const decimal = this.americanToDecimal(s.odds);
      return this.decimalToImpliedProb(decimal);
    });

    const totalImpliedProb = impliedProbs.reduce((a, b) => a + b, 0);
    const isOverround = totalImpliedProb > 1;

    let interpretation = 'Fair odds';
    if (isOverround) {
      interpretation = `Overround detected: true probability sum exceeds 100% (sportsbook margin baked in)`;
    }

    return {
      totalImpliedProb,
      interpretation,
      isOverround,
    };
  }

  /**
   * Analyze parlay break-even requirements
   */
  private analyzeParlayBreakeven(selections: SlipSelection[]): {
    breakEvenWinRate: number;
    volatilityLevel: 'low' | 'medium' | 'high';
  } {
    const impliedProbs = selections.map((s) => {
      const decimal = this.americanToDecimal(s.odds);
      return this.decimalToImpliedProb(decimal);
    });

    // Break-even = 1 / (product of all odds)
    const decimalOdds = selections.map((s) => this.americanToDecimal(s.odds));
    const totalOdds = decimalOdds.reduce((a, b) => a * b, 1);
    const breakEvenWinRate = 1 / totalOdds;

    const volatility = selections.length >= 5 ? 'high' : selections.length >= 3 ? 'medium' : 'low';

    return {
      breakEvenWinRate,
      volatilityLevel: volatility,
    };
  }

  /**
   * Assess risk level based on stake and odds
   */
  private assessRiskLevel(stake: number, odds: number): 'low' | 'medium' | 'high' {
    if (odds > 100 || stake > 500) return 'high';
    if (odds > 10 || stake > 100) return 'medium';
    return 'low';
  }

  /**
   * Generate UUID v4
   */
  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}