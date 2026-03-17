import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameSocket } from '../hooks/useGameSocket'
import QRDisplay from '../components/QRDisplay'
import PlayerList from '../components/PlayerList'
import '../styles/ui.css'

const RoomCreate = () => {
  const navigate = useNavigate()
  const { roomId, players, createRoom, startGame, latestGameStart } = useGameSocket()
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    if (!isStarting || !roomId || !latestGameStart) {
      return
    }

    if (latestGameStart.roomId !== roomId) {
      return
    }

    navigate(`/game/${roomId}`, { state: { initialGameStart: latestGameStart } })
  }, [isStarting, latestGameStart, navigate, roomId])

  const handleCreateRoom = () => {
    createRoom()
  }

  const handleStartGame = () => {
    if (!roomId) return
    setIsStarting(true)
    startGame()
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
                disabled={players.length < 1 || isStarting}
              >
                {isStarting
                  ? 'ゲーム開始中...'
                  : `ゲームを開始する（${players.length} 人参加中）`}
              </button>
              <p className="room-create__hint">デバッグ時は 1 人でも開始できます</p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default RoomCreate
