import { useCallback, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameSocket } from '../hooks/useGameSocket'
import GameCanvas from '../components/GameCanvas'
import GameStatus from '../components/GameStatus'
import { useDemoGameState } from '../hooks/useDemoGameState'
import type { GameState } from '../types'
import type { CollisionEventPayload } from '../game/scenes/GameScene'
import '../styles/game.css'

const ENABLE_DEMO_FALLBACK = import.meta.env.VITE_USE_DEMO_GAMESTATE === 'true'
const ENABLE_TILT_PANEL = true

const Game = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const resolvedRoomId = roomId ?? ''

  // LAUNCH_BEY 受信フラッシュ表示（2秒間表示）
  const [actionFlash, setActionFlash] = useState<{ playerSocketId: string; power: number } | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { latestGameStart, latestPlayerInput, latestPlayerInputs, players, triggerVibrate, triggerVibrateTargets, latestLaunchBey } = useGameSocket(resolvedRoomId, {
    onLaunch: (payload) => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      setActionFlash({ playerSocketId: payload.playerSocketId, power: payload.power })
      flashTimerRef.current = setTimeout(() => setActionFlash(null), 2000)
    }
  })

  const [sceneGameState, setSceneGameState] = useState<GameState | undefined>(undefined)
  const [retrySeed, setRetrySeed] = useState(0)
  const demoGameState = useDemoGameState(resolvedRoomId, ENABLE_DEMO_FALLBACK)
  const gameState = sceneGameState ?? (ENABLE_DEMO_FALLBACK ? demoGameState : undefined)
  const tiltRows = Object.values(latestPlayerInputs)

  const handleStateChange = useCallback((next: GameState) => {
    setSceneGameState(next)
  }, [])

  const handleRetry = useCallback(() => {
    if (!latestGameStart) return
    setSceneGameState(undefined)
    setRetrySeed((prev) => prev + 1)
  }, [latestGameStart])

  const handleCollision = useCallback((payload: CollisionEventPayload) => {
    const targetSocketIds = players
      .filter((player) => payload.playerIds.includes(player.id))
      .map((player) => player.socketId)

    if (targetSocketIds.length === 0) {
      return
    }

    const pattern = payload.kind === 'wall' ? [90] : [120, 60, 120]
    triggerVibrateTargets(targetSocketIds, pattern)
  }, [players, triggerVibrateTargets])

  return (
    <div className="game-page">
      <aside className="game-page__sidebar">
        <GameStatus
          roomId={resolvedRoomId}
          gameState={gameState}
          canRetry={Boolean(latestGameStart)}
          onRetry={handleRetry}
        />

        {ENABLE_TILT_PANEL && (
          <div className="socket-debug-panel">
            <p className="socket-debug-panel__title">Player Tilt (x, y, z)</p>
            <ul className="socket-debug-panel__list">
              {tiltRows.length === 0 && <li>入力待機中...</li>}
              {tiltRows.map((row) => {
                const player = players.find((p) => p.id === row.playerId)
                const label = player?.name ?? row.playerId.slice(0, 6)

                return (
                  <li key={row.playerId}>
                    <span>{label}</span>{' '}
                    x:{row.tiltX.toFixed(2)} y:{row.tiltY.toFixed(2)} z:{(0).toFixed(2)}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* LAUNCH_BEY 受信デバッグバナー */}
        {actionFlash && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            color: '#f87171',
            fontWeight: 'bold',
            fontSize: '12px',
            letterSpacing: '0.1em',
          }}>
            ⚡ Action — {players.find(p => p.socketId === actionFlash.playerSocketId)?.name ?? actionFlash.playerSocketId.slice(0, 6)} (power: {actionFlash.power.toFixed(2)})
          </div>
        )}

        <button
          className="btn btn--secondary"
          style={{ marginBottom: '12px', width: '100%', borderColor: 'rgba(139, 92, 246, 0.3)', color: '#d8b4fe' }}
          onClick={triggerVibrate}
        >
          スマホを振動（テスト）
        </button>

        <button
          className="btn btn--secondary game-page__exit"
          onClick={() => navigate('/')}
        >
          退出
        </button>
      </aside>

      <main className="game-page__canvas">
        <GameCanvas
          key={`${resolvedRoomId}-${retrySeed}`}
          roomId={resolvedRoomId}
          startPayload={latestGameStart}
          inputPayload={latestPlayerInput}
          launchPayload={latestLaunchBey}
          onGameStateChange={handleStateChange}
          onCollision={handleCollision}
          retrySeed={retrySeed}
        />
      </main>
    </div>
  )
}

export default Game
