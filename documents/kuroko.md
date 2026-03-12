# PC側クライアント開発ガイド（kuroko）

**役割**: PC画面担当  
**技術**: React + Phaser + TypeScript  
**責務**: ゲーム画面表示、QRコード生成、プレイヤー一覧、ゲーム同期表示

---

# 1. 責任範囲

✅ **あなたが担当する部分**
- Phaser を使ったゲーム画面描画
- QRコード（ルームID）の生成・表示
- プレイヤー参加者一覧表示
- ゲーム開始ボタン
- サーバー通信（状態受信のみ）
- ゲーム結果表示

❌ **担当しない部分**
- センサー入力処理（スマホが全て）
- ルーム管理ロジック（サーバーが全て）
- Socket.io イベント定義（サーバーが定義）

---

# 2. 技術スタック

| 項目 | 選定 | 用途 |
| --- | --- | --- |
| フレームワーク | React 18 | UI |
| ゲームエンジン | Phaser 3 | ゲーム描画 |
| 言語 | TypeScript | 型安全 |
| 通信 | Socket.io | サーバー連携 |
| QRコード | qrcode.react | QR生成 |
| ビルド | Vite | 高速ビルド |

---

# 3. プロジェクト構成

```
pc-client/
├── src/
│   ├── components/
│   │   ├── GameScreen.tsx        # ゲーム全体とレイアウト
│   │   ├── QRDisplay.tsx         # QRコード表示
│   │   ├── PlayerList.tsx        # プレイヤー一覧
│   │   ├── GameCanvas.tsx        # Phaser コンテナ
│   │   └── GameStatus.tsx        # ゲーム状態表示
│   ├── game/
│   │   ├── PhaserGame.ts         # Phaser インスタンス
│   │   ├── scenes/
│   │   │   ├── MenuScene.ts      # メニュー画面
│   │   │   └── GameScene.ts      # ゲーム画面
│   │   ├── sprites/
│   │   │   └── Bey.ts            # ベイのグラフィック
│   │   └── camera.ts             # カメラ制御
│   ├── socket/
│   │   └── gameSocket.ts         # Socket.io リスナー
│   ├── pages/
│   │   ├── RoomCreate.tsx        # ルーム作成ページ
│   │   └── Game.tsx              # ゲームページ
│   ├── hooks/
│   │   ├── useGameState.ts       # ゲーム状態管理
│   │   └── useSocket.ts          # Socket.io 接続管理
│   ├── styles/
│   │   ├── game.css
│   │   └── ui.css
│   └── App.tsx
├── public/
│   └── assets/                   # ゲーム素材
├── package.json
└── tsconfig.json
```

---

# 4. やるべきこと（段階的）

## フェーズ 1: セットアップ（1日）

- [ ] VS Code + 必要な拡張機能のセットアップ
- [ ] `yarn create vite pc-client --template react-ts`
- [ ] 必要な npm パッケージインストール
  ```bash
  yarn add phaser socket.io-client qrcode.react
  yarn add -D @types/phaser
  ```
- [ ] TypeScript tsconfig.json 最適化
- [ ] ディレクトリ構造作成
- [ ] Git リポジトリにコミット

## フェーズ 2: UI 基盤（2日）

- [ ] React Router でページ遷移実装
  - RoomCreate（ルーム作成）
  - Game（ゲーム画面）
- [ ] QRDisplay コンポーネント実装
  - `qrcode.react` で QR 生成
  - ルームID を URL に含める（重要）
  - スマホでスキャン可能な形で表示
  - (別紙「デフォルト QR リーダー対応」参照)
- [ ] PlayerList コンポーネント実装
  - プレイヤー参加者表示
  - 準備完了インジケータ
- [ ] GameStatus コンポーネント実装
  - 現在のゲーム状態表示
  - スコアボード表示

## フェーズ 3: Socket.io 統合（3日）

**待ち条件**: サーバー側の Socket.io イベント定義が完了

- [ ] `shared/types/socket.ts` を確認
- [ ] useSocket フック実装
  ```typescript
  // ルーム作成時
  socket.emit('createRoom', {})
  
  // プレイヤー参加時
  socket.on('playerJoined', (player) => {...})
  
  // ゲーム開始時
  socket.emit('startGame', {roomId})
  
  // ゲーム状態更新受信（毎フレーム）
  socket.on('gameState', (state) => {...})
  ```

- [ ] useGameState フック実装
  - グローバル状態管理（Context or Zustand）
  - Socket 受信データを状態に反映

- [ ] 接続管理
  - 切断時の処理
  - 再接続ロジック

## フェーズ 4: Phaser ゲーム描画（4日）

**待ち条件**: Socket.io で gameState 受信開始

- [ ] Phaser Scene 設定
  ```typescript
  // GameScene
  - preload()      // アセット読み込み
  - create()       // 初期化
  - update()       // 毎フレーム更新
  ```

- [ ] ゲーム画面描画
  - 背景・ステージ描画
  - ベイ（各プレイヤーの）を描画
  - パーティクル効果（衝突時など）

- [ ] ベイグラフィック実装 (Bey.ts)
  - 円形グラフィック
  - 回転演出
  - ダメージエフェクト

- [ ] カメラ制御
  - 画面サイズ対応
  - ズーム/パン機能

- [ ] サーバー状態を画面に同期
  ```typescript
  // Socket から受信した gameState を
  // Phaser オブジェクトの位置・回転に反映
  ```

## フェーズ 5: UI ポーリッシング（2日）

- [ ] CSS アニメーション
  - ボタンホバー効果
  - ページ遷移エフェクト
  - プレイヤー参加通知

- [ ] レスポンシブ対応
  - 大画面対応（1920x1080 など）
  - 異なるアスペクト比対応

- [ ] ゲーム結果画面
  - 優勝者表示
  - スコアランキング
  - リスタート機能

## フェーズ 6: テスト（2日）

- [ ] コンポーネントテスト
  - QRDisplay のテスト
  - PlayerList のテスト
- [ ] ゲームロジックテスト
  - ゲーム状態の同期テスト
- [ ] 統合テスト
  - mobile-client との連携テスト
  - ルーム作成〜ゲーム終了までの一連フロー

---

# 5. 重要な注意点

### 🔴 Socket.io イベント名

**必ず server と共有する型定義を使う**（`shared/types/socket.ts`）

❌ ダメ例：
```typescript
socket.emit('gameStatus', ...)      // イベント名がズレる
```

✅ 正解例：
```typescript
import { GameSocketEvents } from '@vibrade/shared/types/socket'
socket.emit(GameSocketEvents.GAME_STATE, ...)
```

### 🔴 Phaser の状態管理

Phaser Scene の状態と React の状態は **別物**

```typescript
// PhaserGame.ts 内
this.physics.world   // Phaser のゲーム状態
this.gameState       // サーバから受信した状態

// GameScene.update() で毎フレーム同期
```

### 🔴 パフォーマンス

Phaser で 60fps を維持する必要がある

```typescript
// 重い計算は避ける
// ✅ update() 内は軽い位置更新のみ
// ❌ update() 内で毎フレーム JSON parse するな
```

### 🔴 画面サイズ

```typescript
// Phaser 初期化時
const config = {
  scale: {
    mode: Phaser.Scale.FIT,    // 画面にフィット
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  }
}
```

---

# 6. 依存関係と待機ポイント

| フェーズ | 依存先 | 待機内容 |
| --- | --- | --- |
| フェーズ 3 | サーバー | Socket.io イベント定義（shared/types/socket.ts） |
| フェーズ 4 | サーバー | gameState のデータ構造確定 |
| フェーズ 5 | mobile-client | テスト用のスマホ操作テストが必要 |

---

# 7. サーバーとの心合わせ

### 必ず事前に確認すること

1. **Socket.io イベント一覧**
   - emit するイベント（PC → Server）
   - listen するイベント（Server → PC）

2. **gameState のデータ構造**
   ```typescript
   // このような形で確認
   interface GameState {
     roomId: string
     players: Player[]
     beys: Bey[]        // 各ベイの位置・速度・回転
     winnerId?: string
     isGameActive: boolean
     timestamp: number
   }
   ```

3. **Socket emit タイミング**
   - ルーム作成直後
   - Start ボタン押下時
   - ゲーム終了判定時

---

# 8. 開発中のテスト方法

### ローカルテスト（単体）

```bash
# pc-client だけを開発モードで起動
yarn dev
```

### 統合テスト（スマホと一緒）

```bash
# ターミナル1: サーバー起動
cd server
yarn dev

# ターミナル2: PC クライアント
cd pc-client
yarn dev

# ターミナル3: スマホクライアント
cd mobile-client
yarn dev

# ブラウザで localhost:5173 を開く
```

### デバッグのコツ

**React DevTools**
- State の変化を追跡

**Socket.io Debug**
```typescript
// socket の全イベントを console に出す
socket.onAny((event, ...args) => {
  console.log('Socket Event:', event, args)
})
```

**Phaser Debug**
```typescript
// Phaser の デバッグ層を有効
const config = {
  physics: {
    default: 'arcade',
    arcade: {
      debug: true      // ← コライダー表示
    }
  }
}
```

---

# 9. 完成イメージ

完成時の画面フロー：

```
[RoomCreate]
↓ (ルーム作成)
[GameScreen]
├─ QRDisplay (右上)
├─ PlayerList (左側)
├─ GameCanvas (中央)
└─ StartButton (下部)

↓ (全員参加)

[GameScreen - Playing]
├─ GameCanvas (ゲーム画面)
├─ GameStatus (スコア・タイマー)
└─ [リアルタイム同期]

↓ (ゲーム終了)

[ResultScreen]
├─ Winner表示
├─ ScoreBoard
└─ RestartButton
```

---

# 10. チェックリスト

### 開発完了の確認

- [ ] QRコード表示される
- [ ] スマホで QR 読み取り可能
- [ ] プレイヤー参加時に一覧更新される
- [ ] ゲーム開始時に画面が遷移する
- [ ] Phaser でベイが描画される
- [ ] ベイが正しい位置に移動する
- [ ] 衝突・ダメージが画面に反映される
- [ ] ゲーム終了後、結果画面が表示される
- [ ] 60fps で安定して動作する
- [ ] スマホ複数台での同期が正しい

---

# 補足: よくある質問

**Q1: Phaser で React State を使いたい**  
A: Scene の data オブジェクトを使う（Scene は singleton なので）

```typescript
this.scene.data.set('gameState', newState)
const state = this.scene.data.get('gameState')
```

**Q2: 画像・音声素材はどこに置く？**  
A: `pc-client/public/assets/` に配置して Phaser で preload

```typescript
this.load.image('bey', '/assets/bey.png')
```

---

# 11. QRコード実装ガイド（デフォルトリーダー対応）

## 🎯 設計方針

スマホのデフォルト QR リーダー（iOS カメラアプリ、Android Google Lens など）で読める形にします。

→ **QRスキャナーアプリの実装は不要**

## 📐 QRコード生成方式

### ✅ あるべき形

```typescript
// components/QRDisplay.tsx
import QRCode from 'qrcode.react'
import { useRef } from 'react'

interface QRDisplayProps {
  roomId: string
  serverUrl?: string  // 例: https://vibrade.example.com
}

const QRDisplay = ({ roomId, serverUrl = 'https://vibrade.example.com' }: QRDisplayProps) => {
  const qrRef = useRef<HTMLDivElement>(null)

  // 🔴 重要: URL にルームID を含める
  const joinUrl = `${serverUrl}/join?room=${roomId}`

  const handleDownloadQR = () => {
    // QR コードをダウンロード
    const canvas = qrRef.current?.querySelector('canvas')
    if (canvas) {
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `room-${roomId}.png`
      link.click()
    }
  }

  return (
    <div className="qr-display">
      <h2>プレイヤーを招待</h2>
      
      <div className="qr-container" ref={qrRef}>
        <QRCode 
          value={joinUrl}
          size={256}
          level="H"
          includeMargin
          renderAs="canvas"
        />
      </div>

      <div className="room-info">
        <p><strong>ルームID:</strong> {roomId}</p>
        <p className="instruction">
          📱 スマホでこの QR コードを読み込んでください
        </p>
      </div>

      <button onClick={handleDownloadQR}>
        QR コードをダウンロード
      </button>
    </div>
  )
}

export default QRDisplay
```

## 🔗 URL スキーム

### ✅ 推奨フォーマット

```
https://vibrade.example.com/join?room=ABCD12
```

### 構造

```
https://vibrade.example.com   ← サーバー URL
                      /join   ← ランディングページ
                         ?room=ABCD12  ← クエリパラメータ（roomId）
```

### 追加パラメータ候補

```
https://vibrade.example.com/join?room=ABCD12&lang=ja
```

## 📱 スマホ側の処理（nasu.md 参照）

スマホでこの URL を開くと、**自動的に以下が実行**

```
1. ブラウザ起動
   ↓
2. RoomJoin.tsx ページロード
   ↓
3. URL から ?room=ABCD12 を抽出
   ↓
4. NameInputPage へ自動遷移
   ↓
5. ゲーム参加完了
```

## ✅ チェックリスト

- [ ] `qrcode.react` で QR 生成している
- [ ] QR の内容が URL 形式（`https://...?room=...`）
- [ ] ルームID が URL に正しく含まれている
- [ ] スマホのカメラアプリで読み込める
- [ ] 読み込んだ URL が mobile-client に正しくリダイレクト
- [ ] localhost 開発時は手動フォールバック対応している

---

# 12. よくある質問（追加分）

**Q1: localhost で開発中は QR が読めない**  
A: 手動入力フォールバックを用意。スマホ側のRoomJoinで roomId を手入力可能に。

**Q2: QR コードのサイズは？**  
A: `size={256}` 推奨。十分な大きさで読みやすい。

**Q3: QR の入力レベルは？**  
A: `level="H"` （最高レベル）推奨。部分的な破損にも耐える。

**Q4: 複数ルームを同時に見せたい**  
A: QRDisplay を複数並べればOK。各々 roomId が異なる独立した QR。
