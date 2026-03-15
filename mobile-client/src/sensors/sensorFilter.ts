/**
 * ノイズ除去と値の正規化を行うフィルタクラス
 */
export class SensorFilter {
  private history: number[] = []
  private alpha: number

  constructor(alpha = 0.2) {
    this.alpha = alpha
  }

  /**
   * Exponential Moving Average (指数移動平均) フィルタ
   */
  filter(value: number): number {
    const prev = this.history.length > 0 ? this.history[0] : value
    const filtered = this.alpha * value + (1 - this.alpha) * prev
    this.history.unshift(filtered)
    
    // 履歴が長くなりすぎないようにする (不要なメモリ消費を抑える)
    if (this.history.length > 5) {
      this.history.pop()
    }
    
    return filtered
  }

  /**
   * デッドゾーンの適用 (ノイズによる微小な動きを無視する)
   */
  static applyDeadzone(value: number, threshold = 0.1): number {
    return Math.abs(value) < threshold ? 0 : value
  }

  /**
   * 値の正規化 (-1 ~ 1 の範囲に収める)
   * limit: 最大値 (この値以上は1とする)
   */
  static normalize(value: number, limit = 90): number {
    // 例: 傾きが -90 ~ 90 の範囲で来る場合、それを -1 ~ 1 にする
    const clamped = Math.max(Math.min(value, limit), -limit)
    return clamped / limit
  }
}
