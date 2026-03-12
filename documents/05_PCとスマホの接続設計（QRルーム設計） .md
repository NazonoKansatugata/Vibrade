# PCとスマホの接続設計（QRルーム設計）

ここは **ユーザー体験と実装の両方に影響する重要部分**なので、

「QRコード → ルーム参加 → Socket接続」までを **一貫した設計**でまとめます。

前提スタック

- PC：React + Phaser
- スマホ：React
- 通信：Socket.io
- サーバ：Node.js

---

# 1. 接続の全体フロー

ユーザー体験

```
PCでゲームページを開く
↓
ルーム生成
↓
QRコード表示
↓
スマホでQRを読み取る
↓
スマホがルームに接続
↓
Socket.io接続
↓
プレイヤー参加
```

システムフロー

```
PC
 ↓ createRoom
Server
 ↓ roomId生成
PC
 ↓ QR表示

スマホ
 ↓ QR読み取り
 ↓ roomId取得
 ↓ joinRoom

Server
 ↓ room参加
 ↓ PCへ通知
```

---

# 2. ルームID設計

URL形式

```
https://game.example.com/join?room=ABCD12
```

QRコード内容

```
https://game.example.com/join?room=ABCD12
```

スマホは

```
roomId = URLSearchParams("room")
```

で取得。

---

# 3. ルームID生成

サーバで生成。

例

```jsx
function generateRoomId() {
  return Math.random().toString(36).substring(2,8).toUpperCase()
}
```

例

```
A3K9FQ
X7L2ZT
```

6文字で十分。

---

# 4. ルームデータ構造

Node.js

```jsx
rooms = {
  roomId: {
    hostSocketId,
    players: [],
    gameState,
    createdAt
  }
}
```

Player

```jsx
player = {
  id,
  socketId,
  name,
  ready,
  beyId
}
```

---

# 5. PC接続フロー

PCがページを開いたら

```
createRoom
```

送信。

Socket

```jsx
socket.emit("createRoom")
```

サーバ

```jsx
socket.on("createRoom", () => {

 const roomId = generateRoomId()

 rooms[roomId] = {
   hostSocketId: socket.id,
   players: []
 }

 socket.join(roomId)

 socket.emit("roomCreated", { roomId })

})
```

---

# 6. QRコード生成

React側

QR生成ライブラリ例

- qrcode.react

例

```jsx
<QRCode value={`https://game.example.com/join?room=${roomId}`} />
```

PC画面

```
QR
ルームID
参加人数
```

表示。

---

# 7. スマホ接続フロー

スマホURL

```
/join?room=ABCD12
```

React

```jsx
const roomId = params.get("room")
```

Socket接続

```jsx
socket.emit("joinRoom", {
  roomId,
  playerName
})
```

---

# 8. サーバ joinRoom 処理

```jsx
socket.on("joinRoom", ({roomId, playerName}) => {

 const room = rooms[roomId]

 if(!room){
   socket.emit("error","room not found")
   return
 }

 const player = {
   id: uuid(),
   socketId: socket.id,
   name: playerName
 }

 room.players.push(player)

 socket.join(roomId)

 io.to(roomId).emit("playerList", room.players)

})
```

---

# 9. PC側プレイヤー表示

PCは

```
playerList
```

イベントを受信。

```jsx
socket.on("playerList", players => {
  setPlayers(players)
})
```

表示

```
Player1
Player2
Player3
```

---

# 10. ゲーム開始

PC

```
Start Game
```

押す。

```jsx
socket.emit("startGame", {roomId})
```

サーバ

```jsx
io.to(roomId).emit("gameStart")
```

スマホ

```
操作画面へ
```

遷移。

---

# 11. 切断処理

スマホ切断

```jsx
socket.on("disconnect", () => {
 removePlayer(socket.id)
})
```

PC更新

```
playerList
```

再送信。

---

# 12. ルーム寿命

ルームは

```
5〜10分
```

で削除。

```jsx
if(room.players.length === 0){
 delete rooms[roomId]
}
```

---

# 13. セキュリティ

最低限

### プレイヤー制限

```
maxPlayers = 8
```

### 重複接続防止

```
socketId管理
```

---

# 14. 接続アーキテクチャ

完成図

```
        PC
 React + Phaser
       │
 createRoom
       │
       ▼
    Node.js
   Room Server
       │
 player join
       │
       ▼
    スマホ
 React Controller
```

---

# 15. UX最適化

おすすめ

### QR + 手入力

QR読み取れない時

```
ルームID入力
```

---

# 16. 完成フロー

```
PCページ開く
↓
room作成
↓
QR表示
↓
スマホ読み取り
↓
joinRoom
↓
プレイヤー一覧更新
↓
Start
↓
ゲーム開始
```

---