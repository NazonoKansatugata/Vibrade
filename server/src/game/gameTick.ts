import { Server } from 'socket.io';
import { gameManager } from './gameState.js';
import type { GameState } from './gameState.js';
import { PhysicsEngine } from './physics.js';
import { inputHandler } from '../input/inputHandler.js';
import { CollisionEngine } from './collision.js';
import { Broadcaster } from '../sync/broadcaster.js';
import { roomManager } from '../room/roomManager.js';

const TICK_RATE_MS = 33; // ~30fps

export class GameLoop {
  private io: Server;
  private tickInterval: NodeJS.Timeout | null = null;
  private tickCount: number = 0;
  private broadcaster: Broadcaster;

  constructor(io: Server) {
    this.io = io;
    this.broadcaster = new Broadcaster(io);
  }

  start() {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => this.tick(), TICK_RATE_MS);
    console.log('[GameLoop] Started fixed 30fps game tick.');
  }

  stop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = null;
  }

  private tick() {
    this.tickCount++;
    const activeRooms = roomManager.getAllActiveRoomIds();

    for (const roomId of activeRooms) {
      const room = roomManager.getRoom(roomId);
      if (!room) continue;

      const game = gameManager.getGame(roomId);
      
      // If no game exists for a room, or it's not playing, skip tick processing
      if (!game || game.status !== 'playing') continue;

      this.processGameTick(game);
    }
  }

  private processGameTick(game: GameState) {
    // 1. Process player inputs & update physics
    for (const playerId in game.beys) {
      const bey = game.beys[playerId];
      if (!bey) continue;

      const input = inputHandler.getInput(playerId);
      
      PhysicsEngine.updateBeyPhysics(bey, input, game.arenaRadius);
    }

    // 2. Process collisions
    CollisionEngine.handleCollisions(game.roomId, game.beys, this.broadcaster);

    // 3. Check win condition
     const allBeys = Object.values(game.beys);
     const activeBeys = allBeys.filter(b => b.isActive);
     const launchedBeys = allBeys.filter(b => b.hasLaunched);
     const totalBeys = allBeys.length;

     if (launchedBeys.length === 0) {
       this.broadcaster.broadcastGameState(game.roomId, game, this.tickCount);
       return;
     }

     // For one-player debug sessions, keep the game running instead of ending immediately.
     if (activeBeys.length === 0) {
       game.status = 'ended';
       gameManager.markGameEnded(game.roomId, null);
       this.broadcaster.broadcastGameEnd(game.roomId, game, this.tickCount);
       console.log(`[Game Over] Room: ${game.roomId}. Winner: DRAW`);
       return;
     }

     if (activeBeys.length === 1 && totalBeys > 1 && launchedBeys.length === totalBeys) {
       const winnerId = activeBeys[0]?.id ?? null;
       game.status = 'ended';
       gameManager.markGameEnded(game.roomId, winnerId);
       this.broadcaster.broadcastGameEnd(game.roomId, game, this.tickCount);
       console.log(`[Game Over] Room: ${game.roomId}. Winner: ${winnerId || 'DRAW'}`);
       return; // Stop processing this game's further ticks until reset
     }

    // 4. Broadcast state
    // We pass the tick count for client-side interpolation if necessary
    this.broadcaster.broadcastGameState(game.roomId, game, this.tickCount);
  }
}
