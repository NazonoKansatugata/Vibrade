import type { GameState } from '../types'

export const createDemoGameState = (roomId: string): GameState => ({
  roomId,
  tick: 0,
  status: 'playing',
  isGameActive: true,
  players: [
    { id: 'p1', socketId: 'demo-1', name: 'Player 1', ready: true },
    { id: 'p2', socketId: 'demo-2', name: 'Player 2', ready: true },
  ],
  beys: [
    { id: 'b1', playerId: 'p1', x: 420, y: 320, vx: 2.2, vy: 1.7, energy: 100 },
    { id: 'b2', playerId: 'p2', x: 860, y: 400, vx: -2.1, vy: -1.4, energy: 96 },
  ],
})

export const advanceDemoGameState = (
  current: GameState,
  tick: number,
): GameState => {
  const nextBeys = current.beys.map((bey, index) => {
    let nextX = bey.x + bey.vx * 3
    let nextY = bey.y + bey.vy * 3
    let nextVx = bey.vx
    let nextVy = bey.vy

    if (nextX < 170 || nextX > 1110) {
      nextVx *= -1
      nextX = Math.min(1110, Math.max(170, nextX))
    }

    if (nextY < 120 || nextY > 600) {
      nextVy *= -1
      nextY = Math.min(600, Math.max(120, nextY))
    }

    const nextEnergy = Math.max(0, bey.energy - 0.03 - index * 0.005)

    return {
      ...bey,
      x: nextX,
      y: nextY,
      vx: nextVx,
      vy: nextVy,
      energy: nextEnergy,
    }
  })

  return {
    ...current,
    tick,
    beys: nextBeys,
  }
}