import { useParams, useNavigate } from 'react-router-dom'
import { useGameSocket } from '../hooks/useGameSocket'
import GameCanvas from '../components/GameCanvas'
import GameStatus from '../components/GameStatus'
import { normalizeServerGameState } from '../game/normalizeServerGameState'
import { useDemoGameState } from '../hooks/useDemoGameState'
import '../styles/game.css'

const ENABLE_DEMO_FALLBACK = import.meta.env.VITE_USE_DEMO_GAMESTATE === 'true'
const ENABLE_TILT_PANEL = true

const Game = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { gameState: socketGameState, players } = useGameSocket()
  const resolvedRoomId = roomId ?? ''
  const demoGameState = useDemoGameState(resolvedRoomId, ENABLE_DEMO_FALLBACK)
  const normalizedSocketGameState =
    socketGameState && socketGameState.roomId === resolvedRoomId
      ? normalizeServerGameState(socketGameState, players)
      : null
  const gameState = normalizedSocketGameState ?? (ENABLE_DEMO_FALLBACK ? demoGameState : undefined)

  const tiltEntries = socketGameState?.inputs ? Object.entries(socketGameState.inputs) : []

  return (
    <div className="game-page">
      <aside className="game-page__sidebar">
        <GameStatus roomId={resolvedRoomId} gameState={gameState} />

        {ENABLE_TILT_PANEL && (
          <div className="socket-debug-panel">
            <p className="socket-debug-panel__title">Player Tilt (x, y, z)</p>
            <ul className="socket-debug-panel__list">
              {tiltEntries.length === 0 && <li>入力待機中...</li>}
              {tiltEntries.map(([playerSocketId, tilt]) => {
                const player = players.find(
                  (p) => p.socketId === playerSocketId || p.id === playerSocketId,
                )
                const playerLabel = player?.name ?? playerSocketId.slice(0, 6)

                return (
                  <li key={playerSocketId}>
                    <span>{playerLabel}</span>{' '}
                    x:{tilt.x.toFixed(2)} y:{tilt.y.toFixed(2)} z:{tilt.z.toFixed(2)}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <button
          className="btn btn--secondary game-page__exit"
          onClick={() => navigate('/')}
        >
          退出
        </button>
      </aside>

      <main className="game-page__canvas">
        <GameCanvas roomId={resolvedRoomId} gameState={gameState} />
      </main>
    </div>
  )
}

export default Game
