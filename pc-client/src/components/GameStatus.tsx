import type { GameState } from '../types'

interface GameStatusProps {
  roomId: string
  gameState?: GameState
}

const GameStatus = ({ roomId, gameState }: GameStatusProps) => {
  const playerCount = gameState?.players.length ?? 0
  const activeBeys = gameState?.beys.filter((b) => b.energy > 0).length ?? 0
  const isLaunchReady = gameState?.status === 'armed'

  return (
    <div className="game-status">
      <p className="game-status__room">Room: <strong>{roomId}</strong></p>

      <div className="game-status__state">
        {gameState?.isGameActive ? (
          <>
            <span className="game-status__badge game-status__badge--active">
              PLAYING
            </span>
            <p>残り {activeBeys} / {playerCount} 台</p>
          </>
        ) : isLaunchReady ? (
          <>
            <span className="game-status__badge game-status__badge--waiting">
              READY TO LAUNCH
            </span>
            <p>スマホを振って発射してください</p>
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
            const pct = Math.round((bey.energy / 100) * 100)
            return (
              <li key={bey.id} className="game-status__bey-row">
                <span>{player?.name ?? bey.playerId}</span>
                <div className="game-status__energy-bar">
                  <div
                    className="game-status__energy-fill"
                    style={{ width: `${pct}%` }}
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
    </div>
  )
}

export default GameStatus
