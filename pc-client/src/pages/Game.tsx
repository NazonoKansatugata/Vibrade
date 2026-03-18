import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useGameSocket } from '../hooks/useGameSocket'
import GameCanvas from '../components/GameCanvas'
import GameStatus from '../components/GameStatus'
import QRDisplay from '../components/QRDisplay'
import { useDemoGameState } from '../hooks/useDemoGameState'
import type { GameState } from '../types'
import type { CollisionEventPayload } from '../game/scenes/GameScene'
import type { GameStartPayload } from '../hooks/useGameSocket'
import '../styles/game.css'

const ENABLE_DEMO_FALLBACK = import.meta.env.VITE_USE_DEMO_GAMESTATE === 'true'

const Game = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const resolvedRoomId = roomId ?? ''
  const initialGameStart = (location.state as { initialGameStart?: GameStartPayload } | null)?.initialGameStart ?? null

  // LAUNCH_BEY 受信フラッシュ表示（2秒間表示）
  const [actionFlash, setActionFlash] = useState<{ playerSocketId: string; power: number } | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { latestGameStart, latestPlayerInput, players, triggerVibrateTargets, latestLaunchBey, startGame, endRoom } = useGameSocket(resolvedRoomId, {
    onLaunch: (payload) => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      setActionFlash({ playerSocketId: payload.playerSocketId, power: payload.power })
      flashTimerRef.current = setTimeout(() => setActionFlash(null), 2000)
    }
  })

  const [sceneGameState, setSceneGameState] = useState<GameState | undefined>(undefined)
  const [retrySeed, setRetrySeed] = useState(0)
  const playersRef = useRef(players)
  const effectivePlayersRef = useRef(players)
  const triggerVibrateTargetsRef = useRef(triggerVibrateTargets)
  const demoGameState = useDemoGameState(resolvedRoomId, ENABLE_DEMO_FALLBACK)
  const hasEndedRoomRef = useRef(false)
  const gameState = sceneGameState ?? (ENABLE_DEMO_FALLBACK ? demoGameState : undefined)
  const effectiveGameStart = latestGameStart ?? initialGameStart

  useEffect(() => {
    playersRef.current = players
  }, [players])

  useEffect(() => {
    const fallbackPlayers = effectiveGameStart?.players ?? []
    effectivePlayersRef.current = players.length > 0 ? players : fallbackPlayers
  }, [players, effectiveGameStart])

  useEffect(() => {
    triggerVibrateTargetsRef.current = triggerVibrateTargets
  }, [triggerVibrateTargets])

  const handleStateChange = useCallback((next: GameState) => {
    setSceneGameState(next)
  }, [])

  const handleRetry = useCallback(() => {
    // サーバーに開始を通知することで、最新の参加者リストで全端末を同期させる
    startGame()
    
    // UIを初期化状態に戻す
    setSceneGameState(undefined)
    setRetrySeed((prev) => prev + 1)
  }, [startGame])

  const handleCollision = useCallback((payload: CollisionEventPayload) => {
    const targetSocketIds = effectivePlayersRef.current
      .filter((player) => payload.playerIds.includes(player.id))
      .map((player) => player.socketId)

    if (targetSocketIds.length === 0) {
      return
    }

    const pattern = payload.kind === 'wall' ? [90] : [120, 60, 120]
    triggerVibrateTargetsRef.current(targetSocketIds, pattern)
  }, [])

  const handleExit = useCallback(() => {
    if (!hasEndedRoomRef.current) {
      endRoom()
      hasEndedRoomRef.current = true
    }
    navigate('/')
  }, [endRoom, navigate])

  useEffect(() => {
    return () => {
      if (!hasEndedRoomRef.current) {
        endRoom()
        hasEndedRoomRef.current = true
      }
    }
  }, [endRoom])

  return (
    <div className="game-page">
      <aside className="game-page__sidebar">
        <GameStatus
          gameState={gameState}
          canRetry={Boolean(effectiveGameStart)}
          onRetry={handleRetry}
        />

        <div className="game-page__qr-container">
          <QRDisplay roomId={resolvedRoomId} variant="compact" />
        </div>


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
          className="btn btn--secondary game-page__exit"
          onClick={handleExit}
        >
          退出
        </button>
      </aside>

      <main className="game-page__canvas">
        <GameCanvas
          key={`${resolvedRoomId}-${retrySeed}`}
          roomId={resolvedRoomId}
          startPayload={effectiveGameStart}
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
