import { useParams, useNavigate } from 'react-router-dom'
import GameCanvas from '../components/GameCanvas'
import GameStatus from '../components/GameStatus'
import { useDemoGameState } from '../hooks/useDemoGameState'
import '../styles/game.css'

const Game = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const resolvedRoomId = roomId ?? ''
  const gameState = useDemoGameState(resolvedRoomId)

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
