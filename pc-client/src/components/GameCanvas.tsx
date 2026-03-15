import { useEffect, useRef } from 'react'
import {
  createPhaserGame,
  destroyPhaserGame,
  type PhaserGameHandle,
} from '../game/PhaserGame'
import type { GameState } from '../types'

interface GameCanvasProps {
  roomId: string
  gameState?: GameState
}

const GameCanvas = ({ roomId, gameState }: GameCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<PhaserGameHandle>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    gameRef.current = createPhaserGame(container, roomId)

    return () => {
      if (gameRef.current) {
        destroyPhaserGame(gameRef.current)
      }
      gameRef.current = null
    }
  }, [roomId])

  useEffect(() => {
    if (!gameState) {
      return
    }

    gameRef.current?.updateGameState(gameState)
  }, [gameState])

  return <div ref={containerRef} className="game-canvas" />
}

export default GameCanvas
