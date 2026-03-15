import { useEffect, useState } from 'react'
import { advanceDemoGameState, createDemoGameState } from '../game/demoGameState'
import type { GameState } from '../types'

export const useDemoGameState = (roomId: string): GameState => {
  const [gameState, setGameState] = useState<GameState>(() => createDemoGameState(roomId))

  useEffect(() => {
    setGameState(createDemoGameState(roomId))
  }, [roomId])

  useEffect(() => {
    let tick = 0

    const intervalId = window.setInterval(() => {
      tick += 1
      setGameState((current) => advanceDemoGameState(current, tick))
    }, 33)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  return gameState
}
