import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameSocket } from '../hooks/useGameSocket'
import GameCanvas from '../components/GameCanvas'
import GameStatus from '../components/GameStatus'
import { useDemoGameState } from '../hooks/useDemoGameState'
import type { GameState } from '../types'
import '../styles/game.css'

const ENABLE_DEMO_FALLBACK = import.meta.env.VITE_USE_DEMO_GAMESTATE === 'true'
const ENABLE_TILT_PANEL = true

const Game = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const resolvedRoomId = roomId ?? ''
  const { latestGameStart, latestPlayerInput, latestPlayerInputs, latestLaunchBey, players } = useGameSocket(resolvedRoomId)
  const [sceneGameState, setSceneGameState] = useState<GameState | undefined>(undefined)
  const demoGameState = useDemoGameState(resolvedRoomId, ENABLE_DEMO_FALLBACK)
  const gameState = sceneGameState ?? (ENABLE_DEMO_FALLBACK ? demoGameState : undefined)
  const tiltRows = Object.values(latestPlayerInputs)

  // LAUNCH_BEY 受信フラッシュ表示（2秒間表示）
  const [actionFlash, setActionFlash] = useState<{ playerSocketId: string; power: number } | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!latestLaunchBey) return
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setActionFlash({ playerSocketId: latestLaunchBey.playerSocketId, power: latestLaunchBey.power })
    flashTimerRef.current = setTimeout(() => setActionFlash(null), 2000)
  }, [latestLaunchBey])

  const handleStateChange = useCallback((next: GameState) => {
    setSceneGameState(next)
  }, [])

  return (
    <div className="game-page">
      <aside className="game-page__sidebar">
        <GameStatus roomId={resolvedRoomId} gameState={gameState} />

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
            ⚡ Action — {players.find(p => p.id === actionFlash.playerSocketId)?.name ?? actionFlash.playerSocketId.slice(0, 6)} (power: {actionFlash.power.toFixed(2)})
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
