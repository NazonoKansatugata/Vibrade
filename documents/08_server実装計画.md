# server実装計画

Vibrade の server を、サーバ権威型同期を前提に段階実装するための計画書。

> 2026-03-16 方針変更メモ:
> 物理演算は pc-client(Phaser) 側で実行し、server はルーム管理・接続管理・入力中継を中心にする。
対象: Node.js + TypeScript + Socket.io

---

## 1. ゴール

- ルーム生成からゲーム終了まで server 単体で一貫して制御できる
- 入力同期（20〜30Hz）と状態配信（30Hz）を安定運用できる
- 物理計算・衝突判定・勝敗判定をサーバで確定できる
- pc-client / mobile-client は表示・入力送信に専念できる

---

## 2. 実装方針

### 同期方式
- サーバ権威型（Server Authoritative）
- 入力同期 + 状態ブロードキャスト

### Tick
- game loop: 30fps（33ms）
- 入力受信: 20〜30Hz
- 状態配信: 30Hz

### 責務分離（src）
- room/: ルーム生成・参加・退室
- socket/: Socket.io イベントの入出力
- input/: センサー入力の検証・正規化
- game/: 物理計算・衝突判定・勝敗
- sync/: 状態配信・イベント通知

---

## 3. ディレクトリ計画

```
server/src/
├── index.ts
├── socket/
│   ├── events.ts
│   └── socketHandler.ts
├── room/
│   ├── roomId.ts
│   └── roomManager.ts
├── input/
│   ├── inputHandler.ts
│   ├── gestureDetector.ts
│   └── sensorFilter.ts
├── game/
│   ├── gameState.ts
│   ├── physics.ts
│   ├── collision.ts
│   └── gameTick.ts
└── sync/
    ├── synchronizer.ts
    └── broadcaster.ts
```

---

## 4. フェーズ別タスク

## フェーズ1: 接続基盤（最優先）

### 目的
ルームの作成・参加・切断処理を安定させる。

### 実装
- `socket/events.ts`
  - イベント名定数（createRoom, roomCreated, joinRoom, playerList, error, startGame, gameState, collision）
- `room/roomId.ts`
  - 6文字英数字 roomId 生成
  - 重複チェック
- `room/roomManager.ts`
  - rooms ストア
  - createRoom / joinRoom / removePlayer / removeRoom
- `socket/socketHandler.ts`
  - createRoom 受付
  - joinRoom 受付
  - disconnect で player 除去
  - playerList 配信

### 完了条件
- [ ] PC で createRoom が成功する
- [ ] スマホが joinRoom できる
- [ ] 参加/離脱で playerList が同期される
- [ ] 不正 roomId で error を返す

---

## フェーズ2: 入力処理（傾き + 発射）

### 目的
スマホ入力をゲームループで使える形に正規化する。

### 実装
- `input/sensorFilter.ts`
  - tiltX / tiltY のクランプ
  - timestamp の検証
  - 異常値ガード（NaN, Infinity）
- `input/gestureDetector.ts`
  - launchBey のクールダウン制御（例: 1000ms）
  - launchPower の正規化（0〜1）
- `input/inputHandler.ts`
  - プレイヤー別の最新入力を保持
  - 未入力時のデフォルト値適用

### 完了条件
- [ ] controlInput を安全に取り込める
- [ ] launchBey の連打を防止できる
- [ ] 不正入力で server が落ちない

---

## フェーズ3: ゲームループと物理基盤

### 目的
30fps でベイの位置・速度・回転を更新する。

### 実装
- `game/gameState.ts`
  - Player, Bey, GameState の server 内部型
  - 初期スポーン座標の決定
- `game/physics.ts`
  - 加速度適用（tilt）
  - 摩擦（friction）
  - 回転減衰（spinDecay）
  - controlFactor（回転が高いと操作しづらい）
- `game/gameTick.ts`
  - setInterval(33ms)
  - 入力反映 → 物理更新 → 衝突判定 → 勝敗判定 → 配信

### 完了条件
- [ ] 30fps で tick が継続する
- [ ] 入力に応じて位置・速度が更新される
- [ ] gameState を毎 tick 生成できる

---

## フェーズ4: 衝突・勝敗判定

### 目的
ゲームとして成立する判定ロジックを実装する。

### 実装
- `game/collision.ts`
  - ベイ同士の衝突判定
  - ノックバック計算
  - energy 減衰
- `game/physics.ts`
  - 壁反射（減衰付き）
  - リングアウト判定（arenaRadius 外）
  - スタミナ切れ判定（energy <= 0）
- `sync/broadcaster.ts`
  - collision イベント通知
  - winner 決定通知

### 完了条件
- [ ] 衝突で速度と energy が変化する
- [ ] 脱落判定が正しく動く
- [ ] 最後の1人で勝者が確定する

---

## フェーズ5: 同期最適化・品質向上

### 目的
配信負荷を抑えつつ安定同期を実現する。

### 実装
- `sync/synchronizer.ts`
  - 送信 payload 最適化（必要項目のみ）
  - tick 番号付与
- `sync/broadcaster.ts`
  - room 単位配信
  - 送信失敗時のガード
- ログ/監視
  - room 数
  - 接続数
  - tick 遅延

### 完了条件
- [ ] 30Hz 配信で重大な遅延が出ない
- [ ] 複数 room での配信が破綻しない
- [ ] 切断時のリソース解放ができる

---

## 5. イベント仕様（最小セット）

### client -> server
- `createRoom`: {}
- `joinRoom`: { roomId, playerName }
- `controlInput`: { roomId, tiltX, tiltY, timestamp }
- `launchBey`: { roomId, power, timestamp }
- `startGame`: { roomId }

### server -> client
- `roomCreated`: { roomId }
- `playerList`: { roomId, players }
- `gameState`: { roomId, tick, players, beys, isGameActive, winnerId? }
- `collision`: { roomId, players, impact }
- `error`: { code, message }

---

## 6. テスト計画

## 単体テスト（優先）
- `roomId.ts`: 生成形式・重複率
- `physics.ts`: friction / spinDecay / controlFactor
- `collision.ts`: 衝突時の速度変化・energy 減衰
- `gestureDetector.ts`: cooldown と launch 判定

## 結合テスト
- ルーム作成 -> 参加 -> 開始 -> 終了
- disconnect 時の playerList 更新
- 複数プレイヤー入力の同時処理

## 負荷確認（簡易）
- 8人同時入力で tick 維持
- ルーム複数同時稼働

---

## 7. 直近スプリント案（7日）

### Day 1-2
- フェーズ1（接続基盤）

### Day 3
- フェーズ2（入力処理）

### Day 4-5
- フェーズ3（ゲームループ + 物理）

### Day 6
- フェーズ4（衝突・勝敗）

### Day 7
- フェーズ5（最適化） + テスト補強

---

## 8. リスクと対策

- リスク: 入力ノイズで挙動が不安定
  - 対策: server 側でクランプ・平滑化・異常値破棄

- リスク: 同期遅延で描画がカクつく
  - 対策: tick 番号付与、payload 最小化、client 補間前提で設計

- リスク: room リーク（切断後に残る）
  - 対策: disconnect ハンドリングと空 room の自動削除

- リスク: イベント名の不一致
  - 対策: shared 型（または events.ts）を唯一の定義源に統一

---

## 9. 完了定義（Definition of Done）

- [ ] 2〜8人でルーム作成〜開始〜終了まで通る
- [ ] gameState が 30fps で配信される
- [ ] 脱落/勝敗がサーバで一意に決定される
- [ ] 切断・再接続で致命的エラーが出ない
- [ ] 単体テストと結合テストの最低ラインが CI で通る
