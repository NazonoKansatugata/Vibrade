import { useEffect, useRef } from 'react'
import {
  createPhaserGame,
  destroyPhaserGame,
  type PhaserGameHandle,
} from '../game/PhaserGame'
import type { GameState } from '../types'
import type { GameStartPayload, PlayerInputPayload, LaunchBeyPayload } from '../hooks/useGameSocket'
import type { CollisionEventPayload } from '../game/scenes/GameScene'

interface GameCanvasProps {
  roomId: string
  startPayload?: GameStartPayload | null
  inputPayload?: PlayerInputPayload | null
  launchPayload?: LaunchBeyPayload | null
  onGameStateChange?: (gameState: GameState) => void
  onCollision?: (payload: CollisionEventPayload) => void
  retrySeed?: number
}

const GameCanvas = ({ roomId, startPayload, inputPayload, launchPayload, onGameStateChange, onCollision, retrySeed = 0 }: GameCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<PhaserGameHandle>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    gameRef.current = createPhaserGame(container, roomId, onGameStateChange, onCollision)

    return () => {
      if (gameRef.current) {
        destroyPhaserGame(gameRef.current)
      }
      gameRef.current = null
    }
  }, [roomId, onGameStateChange, onCollision])

  useEffect(() => {
    if (!startPayload) {
      return
    }

    gameRef.current?.startGame(startPayload)
  }, [startPayload, retrySeed])

  useEffect(() => {
    if (!inputPayload) {
      return
    }

    gameRef.current?.applyPlayerInput(inputPayload)
  }, [inputPayload])

  useEffect(() => {
    if (!launchPayload) {
      return
    }

    gameRef.current?.applyLaunch(launchPayload)
  }, [launchPayload])

  return <div ref={containerRef} className="game-canvas" />
}

export default GameCanvas
