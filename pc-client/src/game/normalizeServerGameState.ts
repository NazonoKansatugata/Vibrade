import type { GameState, Player } from '../types'
import type { GameStateData } from '../hooks/useGameSocket'

export const normalizeServerGameState = (
  payload: GameStateData,
  players: Player[],
): GameState => {
  const beys = Object.entries(payload.beys).map(([playerId, bey]) => ({
    id: playerId,
    playerId,
    x: bey.position.x,
    y: bey.position.y,
    vx: bey.velocity.x,
    vy: bey.velocity.y,
    energy: bey.energy,
    rotation: calculateRotation(bey.velocity.x, bey.velocity.y),
  }))

  return {
    roomId: payload.roomId,
    tick: payload.tick,
    players,
    beys,
    isGameActive: payload.isGameActive,
    winnerId: payload.winnerId ?? undefined,
  }
}

const calculateRotation = (vx: number, vy: number) => {
  if (vx === 0 && vy === 0) {
    return 0
  }

  return (Math.atan2(vy, vx) * 180) / Math.PI
}