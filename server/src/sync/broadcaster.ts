import { Server } from 'socket.io';
import { ServerEvents } from '../socket/events.js';
import type { GameState } from '../game/gameState.js';
import { Synchronizer } from './synchronizer.js';

/**
 * Handles all Room-level broadcasts
 */
export class Broadcaster {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Broadcast optimized gamestate to the room
   */
  broadcastGameState(roomId: string, state: GameState, tick: number) {
    const payload = Synchronizer.optimizePayload(state, tick);
    this.io.to(roomId).emit(ServerEvents.GAME_STATE, payload);
  }

  /**
   * Broadcast collision event
   */
  broadcastCollision(roomId: string, playerIds: string[], impact: number) {
    this.io.to(roomId).emit(ServerEvents.COLLISION, {
      players: playerIds,
      // Round impact for bandwidth
      impact: Math.round(impact * 100) / 100
    });
  }

  /**
   * Broadcast game end
   */
  broadcastGameEnd(roomId: string, state: GameState, tick: number) {
    const payload = Synchronizer.optimizePayload(state, tick);
    // Explicitly set game over flags just to be safe
    payload.isGameActive = false;
    this.io.to(roomId).emit(ServerEvents.GAME_STATE, payload);
  }
}
