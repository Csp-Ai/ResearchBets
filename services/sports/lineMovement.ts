import { z } from 'zod';

export const lineMovementEventSchema = z.object({
  id: z.string().uuid(),
  gameId: z.string(),
  market: z.string().min(1),
  selection: z.string().min(1),
  lineValue: z.number(),
  oddsAmerican: z.number().int(),
  book: z.string().min(1),
  direction: z.enum(['up', 'down', 'stable']),
  magnitude: z.number().nonnegative(),
  timestamp: z.string().datetime(),
  capturedAt: z.string().datetime(),
});

export type LineMovementEvent = z.infer<typeof lineMovementEventSchema>;

export const lineHistorySchema = z.object({
  gameId: z.string(),
  market: z.string(),
  selection: z.string(),
  bookId: z.string(),
  events: z.array(lineMovementEventSchema),
  openingLine: z.number(),
  closingLine: z.number().nullable(),
  openingOdds: z.number().int(),
  closingOdds: z.number().int().nullable(),
  volatilityScore: z.number().min(0).max(1),
  movementDirectionBias: z.enum(['favor_selection', 'favor_opposite', 'balanced']),
  totalMovementPoints: z.number().nonnegative(),
  aggregatedAt: z.string().datetime(),
});

export type LineHistory = z.infer<typeof lineHistorySchema>;

export class LineMovementTracker {
  private lineHistories: Map<string, LineMovementEvent[]> = new Map();
  private openingLines: Map<string, { line: number; odds: number; timestamp: string }> = new Map();

  /**
   * Record a new line movement observation
   */
  recordMovement(event: LineMovementEvent): void {
    const key = `${event.gameId}:${event.market}:${event.selection}:${event.book}`;
    if (!this.lineHistories.has(key)) {
      this.lineHistories.set(key, []);
    }
    this.lineHistories.get(key)!.push(event);

    // Track opening line on first recording
    if (!this.openingLines.has(key)) {
      this.openingLines.set(key, {
        line: event.lineValue,
        odds: event.oddsAmerican,
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Get line movement history for a specific market/selection
   */
  getHistory(
    gameId: string,
    market: string,
    selection: string,
    bookId: string
  ): LineMovementEvent[] {
    const key = `${gameId}:${market}:${selection}:${bookId}`;
    return this.lineHistories.get(key) || [];
  }

  /**
   * Calculate line movement magnitude between two points
   */
  calculateMovementMagnitude(previousLine: number, currentLine: number): number {
    return Math.abs(currentLine - previousLine);
  }

  /**
   * Determine movement direction
   */
  determineDirection(previousLine: number, currentLine: number): 'up' | 'down' | 'stable' {
    const threshold = 0.01; // 1 cent tolerance
    if (Math.abs(currentLine - previousLine) < threshold) return 'stable';
    return currentLine > previousLine ? 'up' : 'down';
  }

  /**
   * Get aggregated line history with statistics
   */
  getAggregatedHistory(
    gameId: string,
    market: string,
    selection: string,
    bookId: string
  ): LineHistory | null {
    const key = `${gameId}:${market}:${selection}:${bookId}`;
    const events = this.lineHistories.get(key);

    if (!events || events.length === 0) {
      return null;
    }

    const openingData = this.openingLines.get(key);
    if (!openingData) return null;

    const closingEvent = events[events.length - 1];
    const favorCount = events.filter((e) => e.direction === 'up').length;
    const againstCount = events.filter((e) => e.direction === 'down').length;

    const volatilityScore = this.calculateVolatility(events);

    return {
      gameId,
      market,
      selection,
      bookId,
      events,
      openingLine: openingData.line,
      closingLine: closingEvent.lineValue,
      openingOdds: openingData.odds,
      closingOdds: closingEvent.oddsAmerican,
      volatilityScore,
      movementDirectionBias:
        favorCount > againstCount
          ? 'favor_selection'
          : againstCount > favorCount
            ? 'favor_opposite'
            : 'balanced',
      totalMovementPoints: events.reduce((sum, e) => sum + e.magnitude, 0),
      aggregatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate volatility score (0-1) based on movement frequency and magnitude
   */
  private calculateVolatility(events: LineMovementEvent[]): number {
    if (events.length < 2) return 0;

    const movements = events
      .slice(1)
      .map((e, i) => this.calculateMovementMagnitude(events[i]!.lineValue, e.lineValue));

    const averageMovement = movements.reduce((a, b) => a + b, 0) / movements.length;
    const variance =
      movements.reduce((sum, m) => sum + Math.pow(m - averageMovement, 2), 0) / movements.length;
    const stdDev = Math.sqrt(variance);

    // Normalize: assuming max realistic movement of 10 points yields 1.0 volatility
    return Math.min(stdDev / 10, 1);
  }

  /**
   * Detect sharp action (sudden, significant movement)
   */
  detectSharpAction(
    gameId: string,
    market: string,
    selection: string,
    bookId: string,
    thresholdPoints: number = 2,
    timeWindowMs: number = 300000 // 5 minutes
  ): LineMovementEvent | null {
    const history = this.getHistory(gameId, market, selection, bookId);
    if (history.length < 2) return null;

    const now = new Date().getTime();
    const recentEvents = history.filter((e) => {
      const eventTime = new Date(e.timestamp).getTime();
      return now - eventTime <= timeWindowMs;
    });

    if (recentEvents.length < 2) return null;

    const maxMagnitude = Math.max(...recentEvents.map((e) => e.magnitude));
    if (maxMagnitude >= thresholdPoints) {
      return recentEvents.find((e) => e.magnitude === maxMagnitude) || null;
    }

    return null;
  }

  /**
   * Get consensus line across multiple books
   */
  getConsensusLine(gameId: string, market: string, selection: string): number | null {
    const lines: number[] = [];

    for (const [key, events] of this.lineHistories.entries()) {
      if (
        key.startsWith(`${gameId}:${market}:${selection}:`) &&
        events.length > 0
      ) {
        lines.push(events[events.length - 1]!.lineValue);
      }
    }

    if (lines.length === 0) return null;
    return lines.reduce((a, b) => a + b, 0) / lines.length;
  }
}