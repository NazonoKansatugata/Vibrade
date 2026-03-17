export const GestureState = {
  IDLE: 'IDLE',
  PULLING: 'PULLING',
  LAUNCH: 'LAUNCH',
  COOLDOWN: 'COOLDOWN',
} as const

export type GestureState = typeof GestureState[keyof typeof GestureState]

export interface GestureResult {
  state: GestureState;
  shakePower: number;
  isLaunching: boolean;
}

export class GestureDetector {
  private state: GestureState = GestureState.IDLE;
  private lastLaunchTime: number = 0;
  private cooldownLaunchPower: number = 0;
  
  // しきい値設定
  private readonly PULL_THRESHOLD = 14;
  private readonly LAUNCH_THRESHOLD = 20;
  private readonly COOLDOWN_MS = 1000;
  private readonly MAX_POWER_ACCEL = 25; // shakePowerが1.0になる加速度

  detect(accelMagnitude: number): GestureResult {
    const now = Date.now();

    // クールダウン処理
    if (this.state === GestureState.COOLDOWN) {
      if (now - this.lastLaunchTime > this.COOLDOWN_MS) {
        this.state = GestureState.IDLE;
        this.cooldownLaunchPower = 0;
      }
      return this.getResult(this.cooldownLaunchPower, false);
    }

    // アイドル状態：大きく振りかぶったか？
    if (this.state === GestureState.IDLE) {
      if (accelMagnitude > this.PULL_THRESHOLD) {
        this.state = GestureState.PULLING;
      }
    }

    // 準備（振りかぶり）状態：ピーク（発射）に達したか？
    if (this.state === GestureState.PULLING) {
      // RELOADに入るような強い加速度を検知したら発射成立とする
      // 端末向き差で取りこぼさないよう、Z軸の正負条件は使わない
      if (accelMagnitude > this.LAUNCH_THRESHOLD) {
        this.state = GestureState.COOLDOWN;
        this.lastLaunchTime = now;
        
        // Power計算 (0.0 ~ 1.0)
        let power = accelMagnitude / this.MAX_POWER_ACCEL;
        power = Math.max(0, Math.min(power, 1));
        this.cooldownLaunchPower = power;
        
        return this.getResult(power, true);
      } else if (accelMagnitude < this.PULL_THRESHOLD - 2) {
        // 振りを途中でやめた場合、IDLEに戻す
        this.state = GestureState.IDLE;
      }
    }

    return this.getResult(0, false);
  }

  private getResult(shakePower: number, isLaunching: boolean): GestureResult {
    // UI表示用に、LAUNCHの瞬間だけ状態をLAUNCHとして返す
    const displayState = isLaunching ? GestureState.LAUNCH : this.state;
    return {
      state: displayState,
      shakePower,
      isLaunching
    };
  }
}
