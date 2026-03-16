// ゲーム内で使う共通型
// shared/types が整備されたらそちらに移行する

export interface Player {
  id: string
  socketId: string
  name: string
  ready: boolean
}

export interface Bey {
  id: string
  playerId: string
  x: number
  y: number
  vx: number
  vy: number
  energy: number
  rotation?: number
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
