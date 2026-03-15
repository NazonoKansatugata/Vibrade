// Definitions for Server-Side Game State

export interface Vector2 {
  x: number;
  y: number;
}

export interface BeybladeState {
  id: string;        // matches playerId
  ownerId: string;   
  position: Vector2; 
  velocity: Vector2;
  spinPower: number; // 0 to 100+ (affects control and damage)
  energy: number;    // HP (when 0, bey stops)
  isActive: boolean; // if false, bey is eliminated
  radius: number;    // collision radius
}

export interface GameState {
  roomId: string;
  beys: Record<string, BeybladeState>; // key: playerId
  status: 'waiting' | 'playing' | 'ended';
  arenaRadius: number;
  winnerId?: string | null;
}

// In-memory registry of all active games
export class GameManager {
  private games: Record<string, GameState> = {};

  createGame(roomId: string): GameState {
    const game: GameState = {
      roomId,
      beys: {},
      status: 'waiting',
      arenaRadius: 500 // 500 units radius for the ring
    };
    this.games[roomId] = game;
    return game;
  }

  getGame(roomId: string): GameState | undefined {
    return this.games[roomId];
  }

  removeGame(roomId: string) {
    delete this.games[roomId];
  }

  spawnBey(roomId: string, playerId: string, power: number) {
    const game = this.games[roomId];
    if (!game) return;

    // Default spawn near center with slight variation
    const spawnPos: Vector2 = {
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100
    };

    game.beys[playerId] = {
      id: playerId,
      ownerId: playerId,
      position: spawnPos,
      velocity: { x: 0, y: 0 },
      spinPower: power * 100, // Launch power translates to spin/energy
      energy: 100,            // Base HP
      isActive: true,
      radius: 20              // Base size of Beyblade
    };
  }

  removeBey(roomId: string, playerId: string) {
    const game = this.games[roomId];
    if (game && game.beys[playerId]) {
      delete game.beys[playerId];
    }
  }

  markGameStarted(roomId: string) {
    const game = this.games[roomId];
    if (game) game.status = 'playing';
  }

  markGameEnded(roomId: string, winnerId: string | null = null) {
    const game = this.games[roomId];
    if (game) {
      game.status = 'ended';
      game.winnerId = winnerId;
    }
  }
}

export const gameManager = new GameManager();

