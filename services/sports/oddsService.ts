import { z } from 'zod';

export const oddsSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  reliability: z.number().min(0).max(1),
  coverage: z.array(z.string()), // sports covered
  updateFrequencyMs: z.number().positive(),
  lastFetchedAt: z.string().datetime().nullable(),
});

export type OddsSource = z.infer<typeof oddsSourceSchema>;

export const oddsPriceSchema = z.object({
  id: z.string().uuid(),
  gameId: z.string(),
  market: z.string().min(1), // e.g., "moneyline", "spread", "total"
  selection: z.string().min(1), // e.g., "team_a", "over"
  oddsAmerican: z.number().int(),
  oddsDecimal: z.number().positive(),
  oddsImpliedProb: z.number().min(0).max(1),
  book: z.string().min(1),
  source: z.string().min(1),
  timestamp: z.string().datetime(),
  capturedAt: z.string().datetime(),
});

export type OddsPrice = z.infer<typeof oddsPriceSchema>;

export class OddsService {
  private sources: Map<string, OddsSource> = new Map();
  private prices: Map<string, OddsPrice[]> = new Map(); // gameId:market:selection:book -> prices

  /**
   * Register an odds source
   */
  registerSource(source: OddsSource): void {
    this.sources.set(source.id, source);
  }

  /**
   * Get registered source
   */
  getSource(sourceId: string): OddsSource | undefined {
    return this.sources.get(sourceId);
  }

  /**
   * Record odds price
   */
  recordPrice(price: OddsPrice): void {
    const key = `${price.gameId}:${price.market}:${price.selection}:${price.book}`;
    if (!this.prices.has(key)) {
      this.prices.set(key, []);
    }
    this.prices.get(key)!.push(price);
  }

  /**
   * Get best current odds for a market/selection
   */
  getBestOdds(gameId: string, market: string, selection: string): OddsPrice | null {
    const prices: OddsPrice[] = [];

    for (const [key, priceList] of this.prices.entries()) {
      if (key.startsWith(`${gameId}:${market}:${selection}:`) && priceList.length > 0) {
        prices.push(priceList[priceList.length - 1]!);
      }
    }

    if (prices.length === 0) return null;

    // Return the best odds for the selection (highest for positive odds, least negative for negative)
    return prices.reduce((best, current) => {
      if (current.oddsAmerican >= 0) {
        return best.oddsAmerican >= 0 && current.oddsAmerican > best.oddsAmerican
          ? current
          : best.oddsAmerican >= 0
            ? best
            : current;
      } else {
        return best.oddsAmerican < 0 && current.oddsAmerican > best.oddsAmerican
          ? current
          : best.oddsAmerican < 0
            ? best
            : current;
      }
    });
  }

  /**
   * Get worst odds (for comparison)
   */
  getWorstOdds(gameId: string, market: string, selection: string): OddsPrice | null {
    const prices: OddsPrice[] = [];

    for (const [key, priceList] of this.prices.entries()) {
      if (key.startsWith(`${gameId}:${market}:${selection}:`) && priceList.length > 0) {
        prices.push(priceList[priceList.length - 1]!);
      }
    }

    if (prices.length === 0) return null;
    return prices.reduce((worst, current) =>
      current.oddsAmerican < worst.oddsAmerican ? current : worst
    );
  }

  /**
   * Calculate implied probability from American odds
   */
  calculateImpliedProb(oddsAmerican: number): number {
    if (oddsAmerican > 0) {
      return 100 / (oddsAmerican + 100);
    } else {
      return -oddsAmerican / (-oddsAmerican + 100);
    }
  }

  /**
   * Calculate decimal odds from American
   */
  calculateDecimalOdds(oddsAmerican: number): number {
    if (oddsAmerican > 0) {
      return oddsAmerican / 100 + 1;
    } else {
      return 100 / -oddsAmerican + 1;
    }
  }

  /**
   * Detect line arbitrage opportunities (differing significantly across books)
   */
  detectArbitrage(
    gameId: string,
    market: string,
    selection: string,
    minSpreadBps: number = 100 // basis points
  ): { best: OddsPrice; worst: OddsPrice; spreadBps: number } | null {
    const best = this.getBestOdds(gameId, market, selection);
    const worst = this.getWorstOdds(gameId, market, selection);

    if (!best || !worst) return null;

    const bestProb = this.calculateImpliedProb(best.oddsAmerican);
    const worstProb = this.calculateImpliedProb(worst.oddsAmerican);

    const spreadBps = Math.abs(bestProb - worstProb) * 10000;

    if (spreadBps >= minSpreadBps) {
      return { best, worst, spreadBps };
    }

    return null;
  }

  /**
   * Get odds movement (delta) for a selection
   */
  getOddsMovement(
    gameId: string,
    market: string,
    selection: string,
    book: string,
    timeWindowMs: number = 300000 // 5 minutes
  ): { current: OddsPrice | null; previous: OddsPrice | null; delta: number } {
    const key = `${gameId}:${market}:${selection}:${book}`;
    const history = this.prices.get(key) || [];

    if (history.length === 0) {
      return { current: null, previous: null, delta: 0 };
    }

    const now = new Date().getTime();
    const recentPrices = history.filter((p) => {
      const priceTime = new Date(p.timestamp).getTime();
      return now - priceTime <= timeWindowMs;
    });

    if (recentPrices.length < 2) {
      return {
        current: recentPrices[0] || null,
        previous: null,
        delta: 0,
      };
    }

    const current = recentPrices[recentPrices.length - 1]!;
    const previous = recentPrices[recentPrices.length - 2]!;

    return {
      current,
      previous,
      delta: current.oddsAmerican - previous.oddsAmerican,
    };
  }
}