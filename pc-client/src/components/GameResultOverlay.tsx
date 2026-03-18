import { Trophy, RefreshCcw } from 'lucide-react'
import QRDisplay from './QRDisplay'
import type { GameState } from '../types'

interface GameResultOverlayProps {
  gameState: GameState
  onRetry: () => void
}

const GameResultOverlay = ({ gameState, onRetry }: GameResultOverlayProps) => {
  const winner = gameState.players.find((p) => p.id === gameState.winnerId)
  const isDraw = !gameState.winnerId && gameState.status === 'ended'

  return (
    <div className="game-result-overlay">
      <div className="game-result-overlay__content">
        <div className="game-result-overlay__left">
          <div className="game-result-overlay__qr">
            <QRDisplay roomId={gameState.roomId} variant="compact" />
          </div>
          <div className="game-result-overlay__actions">
            <button className="game-result-overlay__retry-btn" onClick={onRetry}>
              <RefreshCcw size={24} />
              <span>もう一度バトル</span>
            </button>
          </div>
        </div>

        <div className="game-result-overlay__right">
          <div className="game-result-overlay__header">
            {isDraw ? (
              <>
                <div className="game-result-overlay__icon game-result-overlay__icon--draw">⚔️</div>
                <h1 className="game-result-overlay__title">BATTLE DRAW</h1>
              </>
            ) : (
              <>
                <div className="game-result-overlay__icon">
                  <Trophy size={200} color="#fbbf24" strokeWidth={2} />
                </div>
                <h1 className="game-result-overlay__title">VICTORY!</h1>
                <p className="game-result-overlay__winner-name">{winner?.name ?? 'UNKNOWN PLAYER'}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameResultOverlay
