import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Player } from '../types'
import QRDisplay from '../components/QRDisplay'
import PlayerList from '../components/PlayerList'
import '../styles/ui.css'

const RoomCreate = () => {
  const navigate = useNavigate()
  const [roomId, setRoomId] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])

  const handleCreateRoom = () => {
    // TODO: socket.emit('createRoom') → roomCreated イベントで roomId を受信
    // 仮 ID（フェーズ3でサーバー側に差し替え）
    const mockId = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomId(mockId)
    setPlayers([]) // reset
  }

  const handleStartGame = () => {
    if (!roomId) return
    // TODO: socket.emit('startGame', { roomId })
    navigate(`/game/${roomId}`)
  }

  return (
    <div className="room-create">
      <header className="room-create__header">
        <h1>爆転振動！バイブレード</h1>
        <p className="room-create__subtitle">PC をゲーム画面・スマホをコントローラに</p>
      </header>

      <main className="room-create__main">
        {!roomId ? (
          <button className="btn btn--primary btn--large" onClick={handleCreateRoom}>
            ルームを作成する
          </button>
        ) : (
          <>
            <div className="room-create__lobby">
              <section className="room-create__qr">
                <QRDisplay roomId={roomId} />
              </section>

              <section className="room-create__players">
                <PlayerList players={players} />
              </section>
            </div>

            <div className="room-create__actions">
              <button
                className="btn btn--start"
                onClick={handleStartGame}
                disabled={players.length < 1}
              >
                ゲームを開始する（{players.length} 人参加中）
              </button>
              <p className="room-create__hint">最低 2 人以上必要です</p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default RoomCreate
