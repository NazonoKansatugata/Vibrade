// ゲーム内で使う共通型
// shared/types が整備されたらそちらに移行する

export type BeyType = 'power' | 'defense' | 'weight'

export interface Player {
  id: string
  socketId: string
  name: string
  ready: boolean
  beyType?: BeyType
}

export interface Bey {
  id: string
  playerId: string
  x: number
  y: number
  vx: number
  vy: number
  energy: number
  attackAngle?: number
  beyType?: BeyType
}

export interface GameState {
  roomId: string
  tick: number
  players: Player[]
  beys: Bey[]
  status: 'waiting' | 'armed' | 'playing' | 'ended'
  isGameActive: boolean
  winnerId?: string
}
