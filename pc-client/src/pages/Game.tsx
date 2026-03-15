import { useParams, useNavigate } from 'react-router-dom'
import { useGameSocket } from '../hooks/useGameSocket'
import GameStatus from '../components/GameStatus'
import '../styles/game.css'

const Game = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { gameState } = useGameSocket()

  return (
    <div className="game-page">
      <aside className="game-page__sidebar">
        <GameStatus roomId={roomId ?? ''} />

        <button
          className="btn btn--secondary game-page__exit"
          onClick={() => navigate('/')}
        >
          退出
        </button>
      </aside>

      <main className="game-page__canvas" id="phaser-container">
        {/* Placeholder for Phaser */}
        <div className="p-8 text-white/50 space-y-4">
          <h2 className="text-2xl font-bold">Phaser Game Canvas Placeholder</h2>
          <p>Live GameState Stream:</p>
          <pre className="bg-black/50 p-4 rounded text-xs font-mono max-h-96 overflow-auto">
            {JSON.stringify(gameState, null, 2)}
          </pre>
        </div>
      </main>
    </div>
  )
}

export default Game
