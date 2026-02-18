import { z } from 'zod';

export const sportTypeSchema = z.enum(['NFL', 'NBA', 'MLB', 'NHL', 'CFB', 'CBB', 'WNBA', 'MMA', 'BOX']);
export type SportType = z.infer<typeof sportTypeSchema>;

export const gameStatusSchema = z.enum(['scheduled', 'live', 'completed', 'cancelled', 'postponed']);
export type GameStatus = z.infer<typeof gameStatusSchema>;

export const gameEventSchema = z.object({
  id: z.string().uuid(),
  externalGameId: z.string().min(1),
  sport: sportTypeSchema,
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  status: gameStatusSchema,
  scheduledStartTime: z.string().datetime(),
  actualStartTime: z.string().datetime().nullable(),
  endTime: z.string().datetime().nullable(),
  venue: z.string().min(1).nullable(),
  homeScore: z.number().int().nonnegative().nullable(),
  awayScore: z.number().int().nonnegative().nullable(),
  weather: z.object({
    temperature: z.number().nullable(),
    windSpeed: z.number().nullable(),
    condition: z.string().nullable(),
  }).nullable(),
  injuries: z.array(
    z.object({
      playerName: z.string().min(1),
      team: z.string().min(1),
      status: z.enum(['out', 'doubtful', 'questionable', 'probable']),
      designation: z.string().nullable(),
    })
  ),
  metadata: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type GameEvent = z.infer<typeof gameEventSchema>;

export class GameEventService {
  private games: Map<string, GameEvent> = new Map(); // externalGameId -> GameEvent
  private gamesByDate: Map<string, GameEvent[]> = new Map(); // date -> GameEvent[]

  /**
   * Create or update a game event
   */
  upsertGame(game: GameEvent): GameEvent {
    this.games.set(game.externalGameId, game);

    const date = new Date(game.scheduledStartTime).toISOString().split('T')[0]!;
    if (!this.gamesByDate.has(date)) {
      this.gamesByDate.set(date, []);
    }
    const dateGames = this.gamesByDate.get(date)!;
    const existingIndex = dateGames.findIndex((g) => g.externalGameId === game.externalGameId);
    if (existingIndex >= 0) {
      dateGames[existingIndex] = game;
    } else {
      dateGames.push(game);
    }

    return game;
  }

  /**
   * Get a game by external ID
   */
  getGame(externalGameId: string): GameEvent | null {
    return this.games.get(externalGameId) || null;
  }

  /**
   * Get games by date
   */
  getGamesByDate(date: string): GameEvent[] {
    return this.gamesByDate.get(date) || [];
  }

  /**
   * Get live games
   */
  getLiveGames(): GameEvent[] {
    return Array.from(this.games.values()).filter((g) => g.status === 'live');
  }

  /**
   * Get upcoming games
   */
  getUpcomingGames(maxDays: number = 7): GameEvent[] {
    const now = new Date();
    const future = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

    return Array.from(this.games.values()).filter((g) => {
      const gameTime = new Date(g.scheduledStartTime);
      return g.status === 'scheduled' && gameTime >= now && gameTime <= future;
    });
  }

  /**
   * Get games by sport
   */
  getGamesBySport(sport: SportType): GameEvent[] {
    return Array.from(this.games.values()).filter((g) => g.sport === sport);
  }

  /**
   * Update game status
   */
  updateGameStatus(externalGameId: string, status: GameStatus): GameEvent | null {
    const game = this.games.get(externalGameId);
    if (!game) return null;

    const updated: GameEvent = {
      ...game,
      status,
      actualStartTime: status === 'live' && !game.actualStartTime ? new Date().toISOString() : game.actualStartTime,
      endTime: status === 'completed' && !game.endTime ? new Date().toISOString() : game.endTime,
      updatedAt: new Date().toISOString(),
    };

    return this.upsertGame(updated);
  }

  /**
   * Update game score
   */
  updateScore(
    externalGameId: string,
    homeScore: number,
    awayScore: number
  ): GameEvent | null {
    const game = this.games.get(externalGameId);
    if (!game) return null;

    const updated: GameEvent = {
      ...game,
      homeScore,
      awayScore,
      updatedAt: new Date().toISOString(),
    };

    return this.upsertGame(updated);
  }

  /**
   * Add injury report
   */
  addInjury(
    externalGameId: string,
    playerName: string,
    team: string,
    injuryStatus: 'out' | 'doubtful' | 'questionable' | 'probable',
    designation?: string
  ): GameEvent | null {
    const game = this.games.get(externalGameId);
    if (!game) return null;

    // Remove if already exists
    const filtered = game.injuries.filter((i) => !(i.playerName === playerName && i.team === team));

    const updated: GameEvent = {
      ...game,
      injuries: [
        ...filtered,
        {
          playerName,
          team,
          status: injuryStatus,
          designation: designation || null,
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    return this.upsertGame(updated);
  }

  /**
   * Get injury reports for a game
   */
  getInjuryReports(externalGameId: string): GameEvent['injuries'] {
    const game = this.games.get(externalGameId);
    return game?.injuries || [];
  }

  /**
   * Get injury reports for a team
   */
  getTeamInjuryReports(teamId: string): Array<{ game: GameEvent; injuries: GameEvent['injuries'] }> {
    const results: Array<{ game: GameEvent; injuries: GameEvent['injuries'] }> = [];

    for (const game of this.games.values()) {
      if (game.homeTeamId === teamId || game.awayTeamId === teamId) {
        const teamInjuries = game.injuries.filter(
          (i) => i.team === game.homeTeam || i.team === game.awayTeam
        );
        if (teamInjuries.length > 0) {
          results.push({ game, injuries: teamInjuries });
        }
      }
    }

    return results;
  }

  /**
   * Determine if a key player is out
   */
  isKeyPlayerOut(externalGameId: string, playerName: string): boolean {
    const game = this.games.get(externalGameId);
    if (!game) return false;

    return game.injuries.some((i) => i.playerName === playerName && i.status === 'out');
  }

  /**
   * Get schedule for team
   */
  getTeamSchedule(teamId: string, limit: number = 10): GameEvent[] {
    const games = Array.from(this.games.values())
      .filter((g) => g.homeTeamId === teamId || g.awayTeamId === teamId)
      .sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime())
      .slice(0, limit);

    return games;
  }
}