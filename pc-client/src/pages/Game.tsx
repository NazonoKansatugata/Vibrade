import { useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameSocket } from '../hooks/useGameSocket'
import GameCanvas from '../components/GameCanvas'
import GameStatus from '../components/GameStatus'
import { useDemoGameState } from '../hooks/useDemoGameState'
import type { GameState } from '../types'
import '../styles/game.css'

const ENABLE_DEMO_FALLBACK = import.meta.env.VITE_USE_DEMO_GAMESTATE === 'true'
const ENABLE_SOCKET_TIMELINE = true

const Game = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const resolvedRoomId = roomId ?? ''
  const { latestGameStart, latestPlayerInput, debugEvents } = useGameSocket(resolvedRoomId)
  const [sceneGameState, setSceneGameState] = useState<GameState | undefined>(undefined)
  const demoGameState = useDemoGameState(resolvedRoomId, ENABLE_DEMO_FALLBACK)
  const gameState = sceneGameState ?? (ENABLE_DEMO_FALLBACK ? demoGameState : undefined)

  const handleStateChange = useCallback((next: GameState) => {
    setSceneGameState(next)
  }, [])

  return (
    <div className="game-page">
      <aside className="game-page__sidebar">
        <GameStatus roomId={resolvedRoomId} gameState={gameState} />

        {ENABLE_SOCKET_TIMELINE && (
          <div className="socket-debug-panel">
            <p className="socket-debug-panel__title">Socket Timeline</p>
            <ul className="socket-debug-panel__list">
              {debugEvents.slice(0, 8).map((entry, index) => (
                <li key={`${entry.at}-${entry.event}-${index}`}>
                  <span>[{entry.at}]</span> {entry.event}
                  {entry.detail ? ` - ${entry.detail}` : ''}
                </li>
              ))}
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
        <GameCanvas
          roomId={resolvedRoomId}
          startPayload={latestGameStart}
          inputPayload={latestPlayerInput}
          onGameStateChange={handleStateChange}
        />
      </main>
    </div>
  )
}

export default Game
