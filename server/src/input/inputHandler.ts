import { SensorFilter } from './sensorFilter.js';

export interface PlayerInput {
  tiltX: number; // -1.0 to 1.0 (left/right)
  tiltY: number; // -1.0 to 1.0 (up/down)
  timestamp: number;
}

class InputHandler {
  // Keyed by player.socketId (or player.id)
  private currentInputs: Map<string, PlayerInput> = new Map();

  private normalizeAxis(value: number) {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      return 0;
    }

    // Mobile client already sends normalized tilt in the range [-1, 1].
    if (Math.abs(value) <= 1) {
      return SensorFilter.clamp(value, -1, 1);
    }

    // Fallback for older clients that still send raw device angles.
    return SensorFilter.normalize(value, 90);
  }

  /**
   * Called whenever a socket receives `controlInput`
   */
  updateInput(playerId: string, tx: number, ty: number, ts: number) {
    const existing = this.currentInputs.get(playerId);
    
    // Ignore older packets if they arrive out of order
    if (existing && ts < existing.timestamp) {
      return existing;
    }

    // Sanitize and Normalize logic (-1 to 1) assuming input limit is ~90 degrees
    let safeTx = this.normalizeAxis(tx);
    let safeTy = this.normalizeAxis(ty);

    this.currentInputs.set(playerId, {
      tiltX: safeTx,
      tiltY: safeTy,
      timestamp: ts || Date.now()
    });

    return {
      tiltX: safeTx,
      tiltY: safeTy,
      timestamp: ts || Date.now(),
    };
  }

  /**
   * Retrieves the latest input for a player.
   * Will return 0s if no input or player disconnected
   */
  getInput(playerId: string): PlayerInput {
    const input = this.currentInputs.get(playerId);
    if (!input) {
      return { tiltX: 0, tiltY: 0, timestamp: 0 };
    }
    return input;
  }

  removePlayer(playerId: string) {
    this.currentInputs.delete(playerId);
  }
}

export const inputHandler = new InputHandler();
