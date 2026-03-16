import { useParams, useNavigate } from 'react-router-dom'
import { useGameSocket } from '../hooks/useGameSocket'
import GameCanvas from '../components/GameCanvas'
import GameStatus from '../components/GameStatus'
import { normalizeServerGameState } from '../game/normalizeServerGameState'
import { useDemoGameState } from '../hooks/useDemoGameState'
import '../styles/game.css'

const ENABLE_DEMO_FALLBACK = import.meta.env.VITE_USE_DEMO_GAMESTATE === 'true'

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

  return (
    <div className="game-page">
      <aside className="game-page__sidebar">
        <GameStatus roomId={resolvedRoomId} gameState={gameState} />

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
