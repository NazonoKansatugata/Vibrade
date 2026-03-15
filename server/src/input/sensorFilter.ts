export class SensorFilter {
  /**
   * Clamp a value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    if (isNaN(value)) return 0;
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Sanitize value (handle NaN, Infinity) and normalize to [-1, 1]
   */
  static normalize(value: number, limit = 90): number {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      return 0;
    }
    const clamped = this.clamp(value, -limit, limit);
    return clamped / limit; // Returns -1.0 to 1.0
  }

  /**
   * Optional Server-side deadzone
   */
  static applyDeadzone(value: number, threshold = 0.05): number {
    return Math.abs(value) < threshold ? 0 : value;
  }
}
