import { useEffect, useRef } from 'react'
import {
  createPhaserGame,
  destroyPhaserGame,
  type PhaserGameHandle,
} from '../game/PhaserGame'
import type { GameState } from '../types'
import type { GameStartPayload, PlayerInputPayload } from '../hooks/useGameSocket'

interface GameCanvasProps {
  roomId: string
  startPayload?: GameStartPayload | null
  inputPayload?: PlayerInputPayload | null
  onGameStateChange?: (gameState: GameState) => void
  retrySeed?: number
}

const GameCanvas = ({ roomId, startPayload, inputPayload, onGameStateChange, retrySeed = 0 }: GameCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<PhaserGameHandle>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    gameRef.current = createPhaserGame(container, roomId, onGameStateChange)

    return () => {
      if (gameRef.current) {
        destroyPhaserGame(gameRef.current)
      }
      gameRef.current = null
    }
  }, [roomId, onGameStateChange])

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

  return <div ref={containerRef} className="game-canvas" />
}

export default GameCanvas
