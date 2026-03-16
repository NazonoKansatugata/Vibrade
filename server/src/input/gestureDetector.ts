// Cooldown to prevent launching the bey multiple times in a row
export class GestureDetector {
  private lastLaunchTimes: Map<string, number> = new Map();
  private readonly COOLDOWN_MS = 1000;
  private readonly MAX_POWER_ACCEL = 30; 

  private normalizePower(rawPower: number) {
    if (typeof rawPower !== 'number' || Number.isNaN(rawPower) || !Number.isFinite(rawPower)) {
      return 0;
    }

    // New clients send power already normalized in [0, 1].
    if (rawPower >= 0 && rawPower <= 1) {
      return rawPower;
    }

    // Backward compatibility: older clients may send raw acceleration values.
    return rawPower / this.MAX_POWER_ACCEL;
  }

  /**
   * Checks if player is allowed to launch. 
   * Validates cooldown and returns normalized power [0-1]
   */
  validateLaunch(playerId: string, rawPower: number, timestamp: number): { valid: boolean, power: number } {
    const now = Date.now();
    const lastLaunch = this.lastLaunchTimes.get(playerId) || 0;

    // Reject if in cooldown
    if (now - lastLaunch < this.COOLDOWN_MS) {
      return { valid: false, power: 0 };
    }

    // Normalize power
    let power = this.normalizePower(rawPower);
    power = Math.max(0, Math.min(power, 1)); // clamp exactly 0 to 1

    // Register successful launch
    if (power > 0) {
      this.lastLaunchTimes.set(playerId, now);
      return { valid: true, power };
    }

    return { valid: false, power: 0 };
  }

  removePlayer(playerId: string) {
    this.lastLaunchTimes.delete(playerId);
  }
}

export const gestureDetector = new GestureDetector();
