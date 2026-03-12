# スマホ側クライアント開発ガイド（nasu）

**役割**: スマホコントローラー担当  
**技術**: React + TypeScript  
**責務**: センサー入力取得、ジェスチャー検出、操作送信

---

# 1. 責任範囲

✅ **あなたが担当する部分**
- 加速度センサー取得（DeviceMotionEvent）
- デバイス傾き取得（DeviceOrientationEvent）
- 発射ジェスチャー検出（ステートマシン）
- センサーノイズ除去（フィルタ処理）
- サーバーへの操作入力送信
- スマホ画面の UI（操作フィードバック）
- QRコードから取得したルームID の自動処理

❌ **担当しない部分**
- ゲーム画面表示（PC が全て）
- ゲームロジック（サーバーが全て）
- ベイの位置計算（サーバーが全て）
- QRコード生成（PC側で実装）

---

# 2. 技術スタック

| 項目 | 選定 | 用途 |
| --- | --- | --- |
| フレームワーク | React 18 | UI |
| 言語 | TypeScript | 型安全 |
| 通信 | Socket.io | サーバー操作送信 |
| ルーティング | React Router | ページ遷移 |
| ビルド | Vite | 高速ビルド |
| スマホUI | React | レスポンシブ対応 |

---

# 3. プロジェクト構成

```
mobile-client/
├── src/
│   ├── components/
│   │   ├── NameInput.tsx          # プレイヤー名入力
│   │   ├── Controller.tsx         # 操作画面
│   │   ├── TiltIndicator.tsx      # 傾き表示
│   │   ├── ShakeIndicator.tsx     # 振動表示
│   │   └── GameStatus.tsx         # ゲーム状態表示
│   ├── sensors/
│   │   ├── accelerometer.ts       # 加速度センサー取得
│   │   ├── deviceMotion.ts        # デバイス傾き取得
│   │   ├── sensorFilter.ts        # ノイズ除去フィルタ
│   │   └── gestureDetector.ts     # 発射ジェスチャー検出
│   ├── socket/
│   │   └── controlSocket.ts       # Socket.io 制御送信
│   ├── hooks/
│   │   ├── useSensor.ts           # センサーフック
│   │   ├── useGestureDetector.ts  # ジェスチャー検出フック
│   │   └── useSocket.ts           # Socket.io フック
│   ├── pages/
│   │   ├── RoomJoin.tsx           # ルーム参加ページ
│   │   ├── NameInputPage.tsx      # 名前入力ページ
│   │   └── GameController.tsx     # ゲームコントローラー
│   ├── styles/
│   │   ├── controller.css
│   │   └── sensor.css
│   └── App.tsx
├── public/
│   └── index.html
├── package.json
└── tsconfig.json
```

---

# 4. やるべきこと（段階的）

## フェーズ 1: セットアップ（1日）

- [ ] VS Code + 必要な拡張機能のセットアップ
- [ ] `yarn create vite mobile-client --template react-ts`
- [ ] 必要な npm パッケージインストール
  ```bash
  yarn add socket.io-client react-router-dom
  ```
- [ ] TypeScript tsconfig.json 最適化
- [ ] ディレクトリ構造作成
- [ ] Git リポジトリにコミット

## フェーズ 2: UI 基盤（1.5日）

- [ ] React Router でページ遷移実装
  - RoomJoin（ルーム参加ページ）
  - NameInputPage（名前入力）
  - GameController（ゲーム画面）

- [ ] RoomJoin ページ実装
  - URL から `room` クエリパラメータを抽出
  - roomId が無い場合：手動入力フォーム
  - roomId がある場合：自動的に NameInputPage へ遷移
  - (別紙「デフォルト QR リーダー対応」参照)

- [ ] NameInput コンポーネント実装
  - テキスト入力フォーム
  - 送信ボタン

- [ ] Controller コンポーネント実装
  - ゲーム操作画面レイアウト
  - 傾き・振動表示エリア

## フェーズ 3: センサー入力（2.5日）

**センサーアクセス許可の取得が必須**

- [ ] `useSensor` フック実装
  ```typescript
  // DeviceMotion イベントリスナー登録
  window.addEventListener('devicemotion', (event) => {
    const {
      acceleration,
      accelerationIncludingGravity
    } = event
    
    // x, y, z 軸の加速度を取得
  })
  
  // DeviceOrientation イベントリスナー登録
  window.addEventListener('deviceorientation', (event) => {
    const {
      alpha,  // Z 軸回転（0-360）
      beta,   // X 軸傾き（-180 ～ 180）
      gamma   // Y 軸傾き（-90 ～ 90）
    } = event
  })
  ```

- [ ] iOS 13+ 対応
  ```typescript
  // iOS は DeviceMotionEvent 許可が必須
  if (typeof DeviceMotionEvent !== 'undefined' && 
      typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          // リスナー登録
        }
      })
  }
  ```

- [ ] Android 対応
  - Android は自動的にセンサーアクセス可能

- [ ] TiltIndicator コンポーネント実装
  - 傾き値（beta, gamma）を視覚化
  - 例：傾きゲージ、スティック風表現

- [ ] ShakeIndicator コンポーネント実装
  - 加速度（合成値）を視覚化
  - 例：振動ゲージ、パーティクル表現

## フェーズ 4: ノイズ除去フィルタ（1.5日）

**重要：生のセンサー値は使わない**

- [ ] `sensorFilter.ts` 実装
  ```typescript
  // 移動平均フィルタ
  class SensorFilter {
    private history: number[] = []
    private alpha = 0.2
    
    filter(value: number): number {
      // EMA (指数移動平均)
      const filtered = this.alpha * value + 
                      (1 - this.alpha) * (this.history[0] || 0)
      this.history.unshift(filtered)
      return filtered
    }
  }
  ```

- [ ] フィルタの流れ
  ```
  生のセンサー値
        ↓
   移動平均フィルタ
        ↓
   デッドゾーン適用（小さすぎる値は0）
        ↓
   正規化（-1 ～ 1）
        ↓
   利用可能な値
  ```

- [ ] テスト用コンソール出力
  ```typescript
  console.log('Raw:', rawAccel)
  console.log('Filtered:', filteredAccel)
  ```

## フェーズ 5: 発射ジェスチャー検出（2日）

**ドキュメント参照: `03_発射ジェスチャー検出アルゴリズム.md`**

- [ ] `gestureDetector.ts` 実装
  ```typescript
  // ステートマシン
  enum GestureState {
    IDLE = 'IDLE',
    PULLING = 'PULLING',       // 準備中
    LAUNCH = 'LAUNCH',         // 発射
    COOLDOWN = 'COOLDOWN'      // クールダウン中
  }
  ```

- [ ] ステートマシン実装
  ```
  IDLE
  ↓ (加速度閾値超過)
  PULLING
  ↓ (ピーク検出)
  LAUNCH （shakePower 計算）
  ↓ (cooldown待機)
  COOLDOWN
  ↓ (時間経過)
  IDLE
  ```

- [ ] `useGestureDetector` フック実装
  ```typescript
  const { 
    state,        // 現在のジェスチャー状態
    shakePower,   // 発射強度（0 ～ 1）
    isLaunching   // 発射中フラグ
  } = useGestureDetector(filteredAccel)
  ```

- [ ] ShakeIndicator で状態を視覚化
  - PULLING 中は色が変わる
  - LAUNCH で爆発アニメーション

## フェーズ 6: Socket.io 統合（2日）

**待ち条件: サーバー側の Socket.io イベント定義が完了**

- [ ] `controlSocket.ts` 実装
  ```typescript
  // ルーム参加
  socket.emit('joinRoom', {
    roomId: string
  })
  
  // ゲーム開始通知受信
  socket.on('gameStarted', () => {
    // Controller 表示開始
  })
  
  // 毎フレーム操作送信
  socket.emit('playerInput', {
    tiltX,        // デバイス傾き X
    tiltY,        // デバイス傾き Y
    shakePower    // 発射強度
  })
  
  // ゲーム状態受信（視覚フィードバック用）
  socket.on('gameState', (state) => {
    // UI更新（HP、スコアなど）
  })
  ```

- [ ] `useSocket` フック実装
  - 接続管理
  - 切断時処理
  - 再接続ロジック

- [ ] 送信周期設定
  ```typescript
  // 30fps サーバーに合わせて ~33ms ごとに送信
  const SEND_INTERVAL = 33  // ms
  ```

## フェーズ 7: UI ポーリッシング（1.5日）

- [ ] CSS アニメーション
  - ボタンフィードバック
  - 傾き・振動ゲージのアニメーション
  - 発射時の視覚効果

- [ ] レスポンシブ対応
  - 縦向き画面を基本
  - 横向きにも対応

- [ ] ゲーム状態表示
  - HP/Energy ゲージ
  - ゲーム時間表示
  - ランキング表示

- [ ] アクセシビリティ
  - 触覚フィードバック（コントローラ振動）
  ```typescript
  // Vibration API
  navigator.vibrate?.(100)  // 100ms 振動
  ```

## フェーズ 8: テスト（2日）

- [ ] センサテスト
  - 実物スマホで傾き検出確認
  - 振動検出確認
  - ノイズ除去効果確認

- [ ] ジェスチャーテスト
  - 発射ジェスチャーの成功率確認
  - 誤作動が少ないか確認
  - cooldown 時間は適切か

- [ ] 統合テスト
  - pc-client との連携テスト
  - ルーム参加〜ゲーム終了までの一連フロー
  - 複数スマホでの同時操作

---

# 5. 重要な注意点

### 🔴 センサー許可

**iOS 13+ は明示的な許可が必須**

```typescript
async function requestSensorPermission() {
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof DeviceMotionEvent.requestPermission === 'function') {
      const result = await DeviceMotionEvent.requestPermission()
      return result === 'granted'
    }
    // Android: 自動許可
    return true
  } catch (error) {
    console.error('Sensor permission denied:', error)
    return false
  }
}
```

### 🔴 Socket.io イベント名

**必ず server と共有する型定義を使う**

```typescript
import { PlayerControlEvents } from '@vibrade/shared/types/socket'

socket.emit(PlayerControlEvents.PLAYER_INPUT, {
  tiltX, tiltY, shakePower
})
```

### 🔴 送信周期（重要）

サーバーが 30fps なら、スマホも 30fps (~33ms) で送信

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    socket.emit('playerInput', { tiltX, tiltY, shakePower })
  }, 33)  // 30fps
  
  return () => clearInterval(interval)
}, [tiltX, tiltY, shakePower])
```

**高すぎると**: ネットワーク負荷が増加  
**低すぎると**: 操作が遅延

### 🔴 デッドゾーン

小さすぎるセンサー値は 0 にしないと誤作動

```typescript
function applyDeadzone(value: number, threshold = 0.1): number {
  return Math.abs(value) < threshold ? 0 : value
}
```

### 🔴 スマホ画面オフ対策

```typescript
// Screen Wake Lock API でスマホ画面を消さない
async function requestWakeLock() {
  try {
    const wakeLock = await navigator.wakeLock?.request('screen')
    return wakeLock
  } catch (error) {
    console.warn('Wake Lock not supported')
  }
}
```

---

# 6. 依存関係と待機ポイント

| フェーズ | 依存先 | 待機内容 |
| --- | --- | --- |
| フェーズ 6 | サーバー | Socket.io イベント定義（shared/types/socket.ts） |
| フェーズ 8 | pc-client | PC クライアント実装完了後に統合テスト |

---

# 7. サーバーとの心合わせ

### 必ず事前に確認すること

1. **Socket.io イベント一覧**
   ```typescript
   // スマホ → サーバー
   playerInput:   { tiltX, tiltY, shakePower }
   joinRoom:      { roomId, playerName }
   
   // サーバー → スマホ
   gameStarted:   {}
   gameState:     { position, velocity, hp, ... }
   gameEnded:     { winnerId }
   ```

2. **送信周期の確認**
   - サーバーが期待する周期は？
   - 30fps（33ms ごと）で OK か？

3. **値の正規化方法**
   ```typescript
   // tiltX, tiltY: -1 ~ 1
   // shakePower: 0 ~ 1
   // に統一する
   ```

---

# 8. 開発中のテスト方法

### ローカルテスト（単体）

```bash
# mobile-client だけを開発モードで起動
yarn dev

# ブラウザの DevTools で Sensors シミュレートできる
# Chrome: DevTools > Sensors > Device Orientation/Motion
```

### スマホデバイステスト

```bash
# PC と同じ WiFi に接続
# terminal で確認
ipconfig getifaddr en0   # macOS
ipconfig                 # Windows

# スマホブラウザで http://YOUR_PC_IP:5173 にアクセス
```

### デバッグのコツ

**React DevTools**
- props と state の変化を追跡

**Console ログ**
```typescript
console.log('Tilt:', beta, gamma)
console.log('Acceleration:', accX, accY, accZ)
console.log('Gesture State:', gestureState)
console.log('Socket:', socketConnected)
```

**Chrome DevTools - Sensors**
- Device Orientation/Motion をシミュレート
- 開発初期段階で有効

---

# 9. 完成イメージ

完成時の画面フロー：

```
[RoomJoin]
├─ カメラ起動
├─ QRコード読み取り
└─ ルームID 自動抽出

↓ (ルーム参加)

[NameInputPage]
├─ プレイヤー名入力
└─ 参加ボタン

↓ (PC側で開始)

[GameController]
├─ TiltIndicator (傾き表示)
├─ ShakeIndicator (振動表示)
├─ GameStatus (HP・スコア)
└─ [リアルタイム操作送信]

↓ (ゲーム終了)

[ResultScreen]
├─ 順位表示
├─ スコア表示
└─ リスタートボタン
```

---

# 10. チェックリスト

### 開発完了の確認

- [ ] QR スキャナーでコード読み取り可能
- [ ] ルームID が正しく抽出される
- [ ] 名前入力が送信される
- [ ] デバイスモーション許可が取得できる（iOS/Android）
- [ ] 傾きセンサー値が取得できる
- [ ] 加速度センサー値が取得できる
- [ ] ノイズ除去が機能している
- [ ] 発射ジェスチャーが誤作動なく検出される
- [ ] Socket.io で操作がサーバーに送信される
- [ ] ゲーム状態が画面に反映される
- [ ] 複数スマホで同時操作できる
- [ ] ゲーム終了まで安定して動作する

---

# 6. QRコード設計: デフォルトリーダー対応

## 🎯 ユーザーフロー

```
PC側: ルーム作成
  ↓
  QRコード表示
  内容: https://vibrade.example.com/join?room=ABCD12
  ↓
スマホ: デフォルト QR リーダーで読む
（iOS カメラアプリ or Android Google Lens など）
  ↓
ブラウザ自動起動
https://vibrade.example.com/join?room=ABCD12
  ↓
mobile-client: RoomJoin ページ
  ↓
URL から roomId=ABCD12 自動抽出
  ↓
NameInputPage へリダイレクト
  ↓
ゲーム参加へ
```

## 📝 RoomJoin ページの実装例

```typescript
// pages/RoomJoin.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const RoomJoin = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [manualRoomId, setManualRoomId] = useState('')

  useEffect(() => {
    // QRコードから自動抽出した roomId
    const roomId = searchParams.get('room')
    
    if (roomId) {
      // ✅ 自動的に次ステップへ
      navigate('/enter-name', { state: { roomId } })
    }
  }, [searchParams, navigate])

  // roomId が無い場合：手動入力
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualRoomId.trim()) {
      navigate('/enter-name', { state: { roomId: manualRoomId } })
    }
  }

  return (
    <div>
      <h1>ゲームに参加</h1>
      <form onSubmit={handleManualSubmit}>
        <label>ルームID を入力:</label>
        <input
          type="text"
          value={manualRoomId}
          onChange={(e) => setManualRoomId(e.target.value.toUpperCase())}
          placeholder="例: ABCD12"
        />
        <button type="submit">参加</button>
      </form>
      <p>または、PC 側の QR コードをスマホで読み込んでください</p>
    </div>
  )
}

export default RoomJoin
```

## ✅ メリット

- ユーザー体験が最高（スマホのカメラアプリで読むだけ）
- 実装が簡単（QRスキャナー実装不要）
- 権限問題なし（カメラへのアクセス許可不要）
- ローカル開発時は手動入力でテスト可能

## ⚠️ 前提条件

- ドメイン確定: `https://vibrade.example.com` の部分
- HTTPS 環境必須（QRコード→ブラウザ起動で必須）

---

# 補足: よくある質問

**Q1: iOS で センサー許可が出ない**  
A: HTTPS 環境が必須。ローカル開発時は localhost OK

**Q2: Android でセンサーが取得できない**  
A: パーミッション設定確認。manifest に `BODY_SENSORS` 追加

**Q3: 振動検出がノイズだらけ**  
A: フィルタの alpha 値を調整（大きいほどスムーズだが遅延増加）

```typescript
alpha = 0.2   // デフォルト（ノイズが多い場合は 0.1 に下げる）
```

**Q4: 発射ジェスチャーが誤作動する**  
A: 閾値を調整（cooldown 時間、加速度閾値など）

**Q5: スマホ複数台で速度差がある**  
A: ネットワーク遅延。サーバー側で補正が必要（kuroko に相談）
