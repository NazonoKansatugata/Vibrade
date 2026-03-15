export enum GestureState {
  IDLE = 'IDLE',
  PULLING = 'PULLING',
  LAUNCH = 'LAUNCH',
  COOLDOWN = 'COOLDOWN'
}

export interface GestureResult {
  state: GestureState;
  shakePower: number;
  isLaunching: boolean;
}

export class GestureDetector {
  private state: GestureState = GestureState.IDLE;
  private lastLaunchTime: number = 0;
  
  // しきい値設定
  private readonly PULL_THRESHOLD = 14;
  private readonly LAUNCH_THRESHOLD = 20;
  private readonly COOLDOWN_MS = 1000;
  private readonly MAX_POWER_ACCEL = 30; // shakePowerが1.0になる加速度

  detect(accelMagnitude: number, accZ: number): GestureResult {
    const now = Date.now();

    // クールダウン処理
    if (this.state === GestureState.COOLDOWN) {
      if (now - this.lastLaunchTime > this.COOLDOWN_MS) {
        this.state = GestureState.IDLE;
      }
      return this.getResult(0, false);
    }

    // アイドル状態：大きく振りかぶったか？
    if (this.state === GestureState.IDLE) {
      if (accelMagnitude > this.PULL_THRESHOLD) {
        this.state = GestureState.PULLING;
      }
    }

    // 準備（振りかぶり）状態：ピーク（発射）に達したか？
    if (this.state === GestureState.PULLING) {
      // 誤動作防止：Z方向への振り（前方向への振り）かをチェック
      // 端末の向きによってZ軸の正負が変わる可能性があるが、企画書ベースでは accZ > 0 を前方向と想定
      if (accelMagnitude > this.LAUNCH_THRESHOLD && accZ > 0) {
        this.state = GestureState.COOLDOWN;
        this.lastLaunchTime = now;
        
        // Power計算 (0.0 ~ 1.0)
        let power = accelMagnitude / this.MAX_POWER_ACCEL;
        power = Math.max(0, Math.min(power, 1));
        
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
