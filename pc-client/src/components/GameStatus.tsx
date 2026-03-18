import type { GameState } from '../types'

interface GameStatusProps {
  gameState?: GameState
  canRetry?: boolean
  onRetry?: () => void
}

const GameStatus = ({ gameState, canRetry = false, onRetry }: GameStatusProps) => {
  const playerCount = gameState?.players.length ?? 0
  const activeBeys = gameState?.beys.filter((b) => b.energy > 0).length ?? 0
  const displayMaxEnergy = 360

  return (
    <div className="game-status">
      <div className="game-status__state">
        {gameState?.status === 'playing' ? (
          <>
            <span className="game-status__badge game-status__badge--active">
              PLAYING
            </span>
            <p>残り {activeBeys} / {playerCount} 台</p>
          </>
        ) : gameState?.status === 'armed' ? (
          <>
            <span className="game-status__badge game-status__badge--waiting" style={{ background: '#f59e0b' }}>
              READY TO LAUNCH
            </span>
            <p>カウントダウン後に発射してください！</p>
          </>
        ) : (
          <>
            <span className="game-status__badge game-status__badge--waiting">
              WAITING
            </span>
            <p>ホストの開始を待機中</p>
          </>
        )}
      </div>

      {/* ゲーム中はプレイヤーごとの残エネルギーを表示 */}
      {gameState?.isGameActive && gameState.beys.length > 0 && (
        <ul className="game-status__beys">
          {gameState.beys.map((bey) => {
            const player = gameState.players.find((p) => p.id === bey.playerId)
            const currentEnergy = Math.round(bey.energy)
            const barPct = Math.min(100, Math.round((bey.energy / displayMaxEnergy) * 100))
            return (
              <li key={bey.id} className="game-status__bey-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                  <span>{player?.name ?? bey.playerId}</span>
                  <span style={{ fontSize: '12px', opacity: 0.8 }}>{currentEnergy} HP</span>
                </div>
                <div className="game-status__energy-bar">
                  <div
                    className="game-status__energy-fill"
                    style={{ 
                      width: `${barPct}%`,
                      backgroundColor:
                        bey.energy > displayMaxEnergy * 0.66
                          ? '#10b981'
                          : bey.energy > displayMaxEnergy * 0.25
                            ? '#3b82f6'
                            : '#ef4444'
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {gameState?.winnerId && (
        <p className="game-status__winner">
          🏆 {gameState.players.find((p) => p.id === gameState.winnerId)?.name ?? gameState.winnerId} の勝利！
        </p>
      )}

      {gameState?.status === 'ended' && (
        <div className="game-status__result-actions">
          <p className="game-status__result-label">リザルト: {gameState.winnerId ? '勝者あり' : '引き分け'}</p>
          <button
            className="game-status__retry-btn"
            onClick={onRetry}
            disabled={!canRetry || !onRetry}
          >
            もう一度バトル
          </button>
        </div>
      )}
    </div>
  )
}

export default GameStatus
