import type { GameState, BeybladeState } from '../game/gameState.js';
import { inputHandler } from '../input/inputHandler.js';

/**
 * Optimizes the GameState payload before broadcasting it to clients.
 * - Removes unnecessary hidden state variables to save bandwidth.
 * - Rounds floating point numbers (positions, velocities) to 2 decimal places to reduce JSON string size.
 */
export class Synchronizer {
  
  static optimizePayload(state: GameState, tick: number): any {
    const optimizedBeys: Record<string, Partial<BeybladeState>> = {};
    const optimizedInputs: Record<string, { x: number; y: number; z: number; timestamp: number }> = {};
    
    for (const playerId in state.beys) {
      const bey = state.beys[playerId];
      if (!bey) continue;

      optimizedBeys[playerId] = {
        id: bey.id,
        // ownerId is usually same as id, redundant to send every tick
        position: {
          x: Math.round(bey.position.x * 100) / 100,
          y: Math.round(bey.position.y * 100) / 100
        },
        velocity: {
          x: Math.round(bey.velocity.x * 100) / 100,
          y: Math.round(bey.velocity.y * 100) / 100
        },
        spinPower: Math.round(bey.spinPower), // Integers are smaller
        energy: Math.round(bey.energy),
        isActive: bey.isActive,
        hasLaunched: bey.hasLaunched
      };

      const latestInput = inputHandler.getInput(playerId);
      optimizedInputs[playerId] = {
        x: Math.round(latestInput.tiltX * 1000) / 1000,
        y: Math.round(latestInput.tiltY * 1000) / 1000,
        // 現在の入力仕様では Z は送られてこないため 0 固定で返す。
        z: 0,
        timestamp: latestInput.timestamp,
      };
    }

    return {
      roomId: state.roomId,
      beys: optimizedBeys,
      inputs: optimizedInputs,
      tick,
      status: state.status,
      isGameActive: state.status === 'playing',
      winnerId: state.winnerId
    };
  }

}
