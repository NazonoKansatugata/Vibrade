import Phaser from 'phaser'
import BeySprite from '../sprites/Bey'
import type { GameState } from '../../types'
import type { GameStartPayload, PlayerInputPayload } from '../../hooks/useGameSocket'

const SERVER_ARENA_RADIUS = 500
const TICK_MS = 33
const FRICTION = 0.98
const SPIN_DECAY = 0.05
const BASE_ACCEL = 1.5
const MAX_SPEED = 20
const COLLISION_RESTITUTION = 0.82
const BASE_DAMAGE = 7
const IMPACT_MULTIPLIER = 0.45
const BEY_RADIUS = 20

interface RuntimeBey {
  id: string
  playerId: string
  x: number
  y: number
  vx: number
  vy: number
  spinPower: number
  energy: number
  isActive: boolean
  radius: number
}

class GameScene extends Phaser.Scene {
  private readonly roomId: string
  private readonly onStateChange?: (gameState: GameState) => void
  private arena?: Phaser.GameObjects.Arc
  private arenaRing?: Phaser.GameObjects.Arc
  private roomLabel?: Phaser.GameObjects.Text
  private infoLabel?: Phaser.GameObjects.Text
  private beySprites = new Map<string, BeySprite>()
  private players: GameState['players'] = []
  private runtimeBeys = new Map<string, RuntimeBey>()
  private latestInputs = new Map<string, PlayerInputPayload>()
  private status: GameState['status'] = 'waiting'
  private isGameActive = false
  private winnerId?: string
  private tick = 0
  private accumulatorMs = 0
  private lastFrameAt = 0

  constructor(roomId: string, onStateChange?: (gameState: GameState) => void) {
    super({ key: 'game-scene' })
    this.roomId = roomId
    this.onStateChange = onStateChange
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a')
    this.buildScene(this.scale.width, this.scale.height)
    this.infoLabel?.setText('Waiting for host to start')

    this.scale.on('resize', this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.beySprites.forEach((bey) => bey.destroy())
      this.beySprites.clear()
      this.scale.off('resize', this.handleResize, this)
    })
  }

  update(time: number, delta: number) {
    this.beySprites.forEach((bey) => bey.tick())

    if (!this.isGameActive) {
      return
    }

    if (this.lastFrameAt === 0) {
      this.lastFrameAt = time
      return
    }

    this.accumulatorMs += delta
    while (this.accumulatorMs >= TICK_MS && this.isGameActive) {
      this.simulateTick()
      this.accumulatorMs -= TICK_MS
    }
  }

  startSimulation(payload: GameStartPayload) {
    if (payload.roomId !== this.roomId) {
      return
    }

    this.players = payload.players
    this.runtimeBeys.clear()
    this.latestInputs.clear()
    this.tick = 0
    this.accumulatorMs = 0
    this.lastFrameAt = 0
    this.status = 'playing'
    this.isGameActive = true
    this.winnerId = undefined

    const count = Math.max(1, payload.players.length)
    payload.players.forEach((player, index) => {
      const angle = (Math.PI * 2 * index) / count
      const spawnRadius = 140
      this.runtimeBeys.set(player.id, {
        id: player.id,
        playerId: player.id,
        x: Math.cos(angle) * spawnRadius,
        y: Math.sin(angle) * spawnRadius,
        vx: 0,
        vy: 0,
        spinPower: 100,
        energy: 100,
        isActive: true,
        radius: BEY_RADIUS,
      })
    })

    this.emitAndRenderState()
  }

  applyPlayerInput(payload: PlayerInputPayload) {
    if (!this.isGameActive || payload.roomId !== this.roomId) {
      return
    }

    this.latestInputs.set(payload.playerId, payload)
  }

  private buildScene(width: number, height: number) {
    this.arena?.destroy()
    this.arenaRing?.destroy()
    this.roomLabel?.destroy()
    this.infoLabel?.destroy()

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.34

    this.add.rectangle(centerX, centerY, width, height, 0x0b1120, 1)

    this.arena = this.add.circle(centerX, centerY, radius, 0x132238, 0.95)
    this.arena.setStrokeStyle(8, 0x38bdf8, 0.35)

    this.arenaRing = this.add.circle(centerX, centerY, radius * 0.72, 0x0f172a, 0)
    this.arenaRing.setStrokeStyle(3, 0xe2e8f0, 0.25)

    this.roomLabel = this.add.text(centerX, 36, `ROOM ${this.roomId}`, {
      fontFamily: 'Segoe UI',
      fontSize: '24px',
      color: '#e2e8f0',
      fontStyle: 'bold',
    })
    this.roomLabel.setOrigin(0.5, 0)

    this.infoLabel = this.add.text(centerX, height - 44, 'Phaser minimal scene: waiting for server gameState', {
      fontFamily: 'Segoe UI',
      fontSize: '18px',
      color: '#94a3b8',
    })
    this.infoLabel.setOrigin(0.5, 1)
  }

  private renderGameState() {
    const gameState = this.buildGameState()

    this.infoLabel?.setText(
      gameState.isGameActive
        ? `Tick ${gameState.tick} • ${gameState.beys.length} beys rendering`
        : 'Waiting for players to start',
    )

    const activeIds = new Set(gameState.beys.map((bey) => bey.id))

    this.beySprites.forEach((sprite, id) => {
      if (!activeIds.has(id)) {
        sprite.destroy()
        this.beySprites.delete(id)
      }
    })

    gameState.beys.forEach((beyState, index) => {
      let sprite = this.beySprites.get(beyState.id)

      if (!sprite) {
        const playerName = gameState.players.find(
          (player) => player.id === beyState.playerId,
        )?.name
        sprite = new BeySprite(this, beyState.id, playerName ?? `P${index + 1}`)
        this.beySprites.set(beyState.id, sprite)
      }

      sprite.applyState(this.projectX(beyState.x), this.projectY(beyState.y), beyState)
    })
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.buildScene(gameSize.width, gameSize.height)
    this.renderGameState()
  }

  private simulateTick() {
    this.tick += 1

    this.runtimeBeys.forEach((bey, playerId) => {
      if (!bey.isActive) {
        return
      }

      const input = this.latestInputs.get(playerId)
      const tiltX = input?.tiltX ?? 0
      const tiltY = input?.tiltY ?? 0

      const controlFactor = Math.max(0.3, 1 - bey.spinPower / 200)
      bey.vx += tiltX * BASE_ACCEL * controlFactor
      bey.vy += tiltY * BASE_ACCEL * controlFactor

      const speedSq = bey.vx * bey.vx + bey.vy * bey.vy
      if (speedSq > MAX_SPEED * MAX_SPEED) {
        const speed = Math.sqrt(speedSq)
        bey.vx = (bey.vx / speed) * MAX_SPEED
        bey.vy = (bey.vy / speed) * MAX_SPEED
      }

      bey.x += bey.vx
      bey.y += bey.vy
      bey.vx *= FRICTION
      bey.vy *= FRICTION

      bey.spinPower = Math.max(0, bey.spinPower - SPIN_DECAY)
      bey.energy = Math.max(0, bey.energy - 0.02)

      const distSq = bey.x * bey.x + bey.y * bey.y
      if (distSq > SERVER_ARENA_RADIUS * SERVER_ARENA_RADIUS || bey.spinPower <= 0 || bey.energy <= 0) {
        bey.isActive = false
        bey.energy = 0
        bey.vx = 0
        bey.vy = 0
      }
    })

    this.resolveCollisions()
    this.resolveWinner()
    this.emitAndRenderState()
  }

  private resolveCollisions() {
    const beys = Array.from(this.runtimeBeys.values())
    for (let i = 0; i < beys.length; i += 1) {
      for (let j = i + 1; j < beys.length; j += 1) {
        const a = beys[i]
        const b = beys[j]
        if (!a || !b || !a.isActive || !b.isActive) {
          continue
        }

        const dx = b.x - a.x
        const dy = b.y - a.y
        const distSq = dx * dx + dy * dy
        const minDist = a.radius + b.radius

        if (distSq === 0 || distSq >= minDist * minDist) {
          continue
        }

        const dist = Math.sqrt(distSq)
        const nx = dx / dist
        const ny = dy / dist

        const rvx = b.vx - a.vx
        const rvy = b.vy - a.vy
        const velAlongNormal = rvx * nx + rvy * ny
        if (velAlongNormal > 0) {
          continue
        }

        const impulse = (-(1 + COLLISION_RESTITUTION) * velAlongNormal) / 2
        a.vx -= impulse * nx
        a.vy -= impulse * ny
        b.vx += impulse * nx
        b.vy += impulse * ny

        const penetration = minDist - dist
        const correction = (Math.max(penetration - 0.1, 0) / 2) * 0.35
        a.x -= nx * correction
        a.y -= ny * correction
        b.x += nx * correction
        b.y += ny * correction

        const impact = Math.abs(impulse)
        const aAdv = a.spinPower / Math.max(1, b.spinPower)
        const damageToA = BASE_DAMAGE + (impact * IMPACT_MULTIPLIER) / Math.max(0.2, aAdv)
        const damageToB = BASE_DAMAGE + impact * IMPACT_MULTIPLIER * Math.max(0.2, aAdv)

        a.energy = Math.max(0, a.energy - damageToA)
        b.energy = Math.max(0, b.energy - damageToB)

        if (a.energy <= 0) {
          a.isActive = false
        }
        if (b.energy <= 0) {
          b.isActive = false
        }
      }
    }
  }

  private resolveWinner() {
    const active = Array.from(this.runtimeBeys.values()).filter((bey) => bey.isActive)
    const total = this.runtimeBeys.size

    if (total <= 1) {
      return
    }

    if (active.length <= 1) {
      this.isGameActive = false
      this.status = 'ended'
      this.winnerId = active[0]?.playerId
    }
  }

  private buildGameState(): GameState {
    const beys = Array.from(this.runtimeBeys.values()).map((bey) => ({
      id: bey.id,
      playerId: bey.playerId,
      x: bey.x,
      y: bey.y,
      vx: bey.vx,
      vy: bey.vy,
      energy: bey.energy,
      rotation: this.calculateRotation(bey.vx, bey.vy),
    }))

    return {
      roomId: this.roomId,
      tick: this.tick,
      players: this.players,
      beys,
      status: this.status,
      isGameActive: this.isGameActive,
      winnerId: this.winnerId,
    }
  }

  private emitAndRenderState() {
    const snapshot = this.buildGameState()
    this.onStateChange?.(snapshot)
    this.renderGameState()
  }

  private calculateRotation(vx: number, vy: number) {
    if (vx === 0 && vy === 0) {
      return 0
    }
    return (Math.atan2(vy, vx) * 180) / Math.PI
  }

  private projectX(x: number) {
    const centerX = this.scale.width / 2
    const arenaPixelRadius = Math.min(this.scale.width, this.scale.height) * 0.34 * 0.9
    return centerX + (x / SERVER_ARENA_RADIUS) * arenaPixelRadius
  }

  private projectY(y: number) {
    const centerY = this.scale.height / 2
    const arenaPixelRadius = Math.min(this.scale.width, this.scale.height) * 0.34 * 0.9
    return centerY + (y / SERVER_ARENA_RADIUS) * arenaPixelRadius
  }
}

export default GameScene
