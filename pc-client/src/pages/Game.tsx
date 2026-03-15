import { useParams, useNavigate } from 'react-router-dom'
import GameStatus from '../components/GameStatus'
import '../styles/game.css'

const Game = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()

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
        {/* Phaser がここにマウントされる（フェーズ4） */}
        <p className="game-page__placeholder">Phaser ゲーム画面</p>
      </main>
    </div>
  )
}

export default Game
