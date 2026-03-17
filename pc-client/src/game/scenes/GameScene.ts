import Phaser from 'phaser'
import BeySprite from '../sprites/Bey'
import type { GameState } from '../../types'
import type { GameStartPayload, PlayerInputPayload, LaunchBeyPayload } from '../../hooks/useGameSocket'

const TICK_MS = 33
const FRICTION = 0.98
const ENERGY_DECAY = 0.05
const BASE_ACCEL = 1.5
const BOOST_FORCE = 8.0
const COLLISION_RESTITUTION = 0.82
const COLLISION_KNOCKBACK_BOOST = 1.45
const MIN_COLLISION_KNOCKBACK = 2.0
const WALL_RESTITUTION = 0.86
const COLLISION_RINGOUT_MIN_TICKS = 6
const COLLISION_RINGOUT_MAX_TICKS = 14
const COLLISION_RINGOUT_IMPACT_THRESHOLD = 2.9
const BASE_DAMAGE = 7
const IMPACT_MULTIPLIER = 0.45
const BASE_ENERGY = 100
const ARMED_TIMEOUT_MS = 3000
const COUNTDOWN_INTERVAL_MS = 1000
const PENALTY_MIN_ENERGY_FACTOR = 0.3
const OTEZUKI_ENERGY_FACTOR = 0.7
// 1280x720基準の描画サイズ(外円半径約33px)をワールド座標へ合わせる
const BEY_RADIUS = 72
const HAPTIC_COLLISION_COOLDOWN_MS = 180
const ATTACK_POINT_ORBIT_RADIUS = 54
const ATTACK_POINT_TARGET_PADDING = 34
const ATTACK_POINT_DAMAGE_MULTIPLIER = 2.35
const ATTACK_POINT_KNOCKBACK_MULTIPLIER = 1.9
const ATTACK_POINT_SELF_RECOIL = 0.3
const ARENA_RENDER_RADIUS_SCALE = 0.34

export interface CollisionEventPayload {
  playerIds: string[]
  kind: 'bey' | 'wall'
}

interface RuntimeBey {
  id: string
  playerId: string
  x: number
  y: number
  vx: number
  vy: number
  energy: number
  isActive: boolean
  radius: number
  ringoutArmedTicks: number
  attackAngle: number
  attackSpinRate: number
  launchTime?: number
}

class GameScene extends Phaser.Scene {
  private readonly roomId: string
  private readonly onStateChange?: (gameState: GameState) => void
  private readonly onCollision?: (payload: CollisionEventPayload) => void
  private arenaRadius: number = 500
  private unitToPixel: number = 1
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
  private isSceneReady = false
  private pendingStartPayload?: GameStartPayload
  private countdownText?: Phaser.GameObjects.Text
  private shootStartTime: number = 0
  private countdownState: '3' | '2' | '1' | 'GO' | 'SHOOT' | 'NONE' = 'NONE'
  private lastCountdownUpdateAt: number = 0
  private lastCollisionHapticAt = new Map<string, number>()

  constructor(
    roomId: string,
    onStateChange?: (gameState: GameState) => void,
    onCollision?: (payload: CollisionEventPayload) => void,
  ) {
    super({ key: 'game-scene' })
    this.roomId = roomId
    this.onStateChange = onStateChange
    this.onCollision = onCollision
  }

  create() {
    this.isSceneReady = true
    this.cameras.main.setBackgroundColor('#0f172a')
    this.buildScene(this.scale.width, this.scale.height)
    this.infoLabel?.setText('Waiting for host to start')

    if (this.pendingStartPayload) {
      const payload = this.pendingStartPayload
      this.pendingStartPayload = undefined
      this.startSimulation(payload)
    }

    this.scale.on('resize', this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.isSceneReady = false
      this.pendingStartPayload = undefined
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

    if (this.status === 'armed') {
      this.handleCountdown(time)
    }
  }

  private handleCountdown(time: number) {
    if (this.lastCountdownUpdateAt === 0) {
      this.lastCountdownUpdateAt = time
      this.updateCountdownUI('3')
      return
    }

    const elapsed = time - this.lastCountdownUpdateAt

    if (this.countdownState === '3' && elapsed >= COUNTDOWN_INTERVAL_MS) {
      this.updateCountdownUI('2')
      this.lastCountdownUpdateAt = time
    } else if (this.countdownState === '2' && elapsed >= COUNTDOWN_INTERVAL_MS) {
      this.updateCountdownUI('1')
      this.lastCountdownUpdateAt = time
    } else if (this.countdownState === '1' && elapsed >= COUNTDOWN_INTERVAL_MS) {
      this.updateCountdownUI('GO')
      this.lastCountdownUpdateAt = time
    } else if (this.countdownState === 'GO' && elapsed >= COUNTDOWN_INTERVAL_MS) {
      this.updateCountdownUI('SHOOT')
      this.lastCountdownUpdateAt = time
      this.shootStartTime = time
    } else if (this.countdownState === 'SHOOT') {
      // 全員発射済みか、タイムアウトで開始
      const allLaunchedOrTimeout = 
        Array.from(this.runtimeBeys.values()).every(b => b.launchTime !== undefined) || 
        (time - this.shootStartTime >= ARMED_TIMEOUT_MS)

      if (allLaunchedOrTimeout) {
        this.finalizeLaunch()
      }
    }
  }

  private updateCountdownUI(state: typeof this.countdownState) {
    this.countdownState = state
    if (!this.countdownText) return

    let text = ''
    let color = '#ffffff'
    let scale = 1

    switch (state) {
      case '3': text = '3'; break
      case '2': text = '2'; break
      case '1': text = '1'; break
      case 'GO': text = 'GO!'; color = '#fbbf24'; scale = 1.2; break
      case 'SHOOT': text = 'SHOOT!!!'; color = '#ef4444'; scale = 1.5; break
    }

    this.countdownText.setText(text)
    this.countdownText.setColor(color)
    this.countdownText.setScale(scale)
    this.countdownText.setVisible(true)

    // ポップアップアニメーション
    this.tweens.add({
      targets: this.countdownText,
      scale: scale * 1.5,
      alpha: { from: 1, to: 0.8 },
      duration: 200,
      yoyo: true,
    })
  }

  private finalizeLaunch() {
    this.status = 'playing'
    this.countdownState = 'NONE'
    this.countdownText?.setVisible(false)

    const totalPlayers = this.runtimeBeys.size
    const maxBuffPlayers = Math.ceil(totalPlayers / 2)
    let remainingBuffPool = totalPlayers * 0.25

    // 成功したプレイヤー（指示後かつタイムアウト前）を時間順にソート
    const successfulPlayers = Array.from(this.runtimeBeys.values())
      .filter(b => b.launchTime !== undefined && b.launchTime >= this.shootStartTime && (b.launchTime - this.shootStartTime) < ARMED_TIMEOUT_MS)
      .sort((a, b) => (a.launchTime || 0) - (b.launchTime || 0))

    // 各プレイヤーのエネルギーを確定
    this.runtimeBeys.forEach((bey) => {
      const launchDelta = bey.launchTime !== undefined ? bey.launchTime - this.shootStartTime : undefined

      if (launchDelta === undefined || launchDelta >= ARMED_TIMEOUT_MS) {
        // タイムアウト
        bey.energy = BASE_ENERGY * PENALTY_MIN_ENERGY_FACTOR
      } else if (launchDelta < 0) {
        // お手付き
        bey.energy = BASE_ENERGY * OTEZUKI_ENERGY_FACTOR
      } else {
        // 成功
        const rank = successfulPlayers.findIndex(p => p.id === bey.id) + 1
        let energyFactor = 1.0

        if (rank > 0 && rank <= maxBuffPlayers && remainingBuffPool > 0) {
          const buff = Math.min(0.5, remainingBuffPool)
          energyFactor += buff
          remainingBuffPool -= buff
        }
        
        bey.energy = BASE_ENERGY * energyFactor
      }
    })

    this.emitAndRenderState()
  }

  startSimulation(payload: GameStartPayload) {
    if (payload.roomId !== this.roomId) {
      return
    }

    if (!this.isSceneReady) {
      this.pendingStartPayload = payload
      return
    }

    this.players = payload.players
    this.runtimeBeys.clear()
    this.latestInputs.clear()
    this.tick = 0
    this.accumulatorMs = 0
    this.lastFrameAt = 0
    this.status = 'armed'
    this.isGameActive = true
    this.winnerId = undefined
    this.lastCollisionHapticAt.clear()
    this.shootStartTime = 0
    this.countdownState = 'NONE'
    this.lastCountdownUpdateAt = 0

    const count = payload.players.length
    this.arenaRadius = 400 + (Math.max(2, count) - 2) * 50
    this.buildScene(this.scale.width, this.scale.height)

    payload.players.forEach((player, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, count)
      const spawnRadius = this.arenaRadius * 0.3
      this.runtimeBeys.set(player.id, {
        id: player.id,
        playerId: player.id,
        x: Math.cos(angle) * spawnRadius,
        y: Math.sin(angle) * spawnRadius,
        vx: 0,
        vy: 0,
        energy: 100,
        isActive: true,
        radius: BEY_RADIUS,
        ringoutArmedTicks: 0,
        attackAngle: ((index * Math.PI) / 2) % (Math.PI * 2),
        attackSpinRate: 0.18 + (index % 3) * 0.03,
        launchTime: undefined,
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

  applyLaunch(payload: LaunchBeyPayload) {
    if (!this.isGameActive) {
      return
    }

    const playerId = this.players.find((player) => player.socketId === payload.playerSocketId)?.id
    if (!playerId) {
      return
    }

    const bey = this.runtimeBeys.get(playerId)
    if (!bey || !bey.isActive) {
      return
    }

    const input = this.latestInputs.get(playerId)
    let dx = input?.tiltX ?? 0
    let dy = input?.tiltY ?? 0

    // 入力がない場合は現在の速度方向へブースト
    if (dx === 0 && dy === 0) {
      const speed = Math.sqrt(bey.vx * bey.vx + bey.vy * bey.vy)
      if (speed > 0) {
        dx = bey.vx / speed
        dy = bey.vy / speed
      } else {
        // 停止していて入力もない場合はランダム方向へ
        const angle = Math.random() * Math.PI * 2
        dx = Math.cos(angle)
        dy = Math.sin(angle)
      }
    } else {
      // 入力のベクトルを正規化
      const len = Math.sqrt(dx * dx + dy * dy)
      dx /= len
      dy /= len
    }

    // パワーに応じたブースト（最大 BOOST_FORCE）
    const force = BOOST_FORCE * Math.max(0.2, payload.power)
    
    if (this.status === 'armed') {
      // 準備中は何回振っても最後のタイミングが記録される（お手付き上書き可、ただしSHOOT後は確定）
      if (bey.launchTime === undefined || this.countdownState === 'SHOOT') {
        const now = this.game.loop.time
        bey.launchTime = now
      }
      return
    }

    bey.vx += dx * force
    bey.vy += dy * force

    // 最大速度制限は simulateTick で行われるが、瞬間的に超えるのは許容（あるいはここで軽くキャップ）
  }

  private buildScene(width: number, height: number) {
    this.arena?.destroy()
    this.arenaRing?.destroy()
    this.roomLabel?.destroy()
    this.infoLabel?.destroy()

    const centerX = width / 2
    const centerY = height / 2
    
    // 基準となる4人時(半径500)のピクセル半径を計算
    const baseArenaPixelRadius = Math.min(width, height) * ARENA_RENDER_RADIUS_SCALE
    this.unitToPixel = baseArenaPixelRadius / 500
    
    // 現在の人数に応じた描画半径
    const currentArenaPixelRadius = this.arenaRadius * this.unitToPixel

    this.add.rectangle(centerX, centerY, width, height, 0x0b1120, 1)

    this.arena = this.add.circle(centerX, centerY, currentArenaPixelRadius, 0x132238, 0.95)
    this.arena.setStrokeStyle(8, 0x38bdf8, 0.35)

    this.arenaRing = this.add.circle(centerX, centerY, currentArenaPixelRadius * 0.72, 0x0f172a, 0)
    this.arenaRing.setStrokeStyle(3, 0xe2e8f0, 0.25)

    this.roomLabel = this.add.text(centerX, 36, `ROOM ${this.roomId}`, {
      fontFamily: 'Segoe UI',
      fontSize: '24px',
      color: '#e2e8f0',
      fontStyle: 'bold',
    })
    this.roomLabel.setOrigin(0.5, 0)

    this.countdownText = this.add.text(centerX, centerY, '', {
      fontFamily: 'Segoe UI',
      fontSize: '84px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    this.countdownText.setOrigin(0.5)
    this.countdownText.setVisible(false)
    this.countdownText.setDepth(100)

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
        sprite = new BeySprite(this, beyState.id, playerName ?? `P${index + 1}`, this.unitToPixel)
        this.beySprites.set(beyState.id, sprite)
      }

      sprite.applyState(this.projectX(beyState.x), this.projectY(beyState.y), beyState, this.unitToPixel)
    })
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.buildScene(gameSize.width, gameSize.height)
    this.renderGameState()
  }

  private simulateTick() {
    this.tick += 1

    const isArmed = this.status === 'armed'

    this.runtimeBeys.forEach((bey, playerId) => {
      if (!bey.isActive) {
        return
      }

      if (isArmed) {
        // armed状態は位置を動かさない
        return
      }

      const input = this.latestInputs.get(playerId)
      const tiltX = input?.tiltX ?? 0
      const tiltY = input?.tiltY ?? 0

      const controlFactor = Math.max(0.3, 1 - bey.energy / 200)
      bey.vx += tiltX * BASE_ACCEL * controlFactor
      bey.vy += tiltY * BASE_ACCEL * controlFactor

      const speed = Math.sqrt(bey.vx * bey.vx + bey.vy * bey.vy)
      bey.attackAngle = (bey.attackAngle + bey.attackSpinRate * (0.8 + speed / 20)) % (Math.PI * 2)

      bey.x += bey.vx
      bey.y += bey.vy
      bey.vx *= FRICTION
      bey.vy *= FRICTION

      bey.energy = Math.max(0, bey.energy - ENERGY_DECAY)

      if (bey.energy <= 0) {
        bey.isActive = false
        bey.energy = 0
        bey.vx = 0
        bey.vy = 0
        return
      }

      const boundaryResult = this.handleArenaBoundary(bey)
      if (boundaryResult !== 'none') {
        this.emitCollisionHaptic([playerId], 'wall')
      }

      if (boundaryResult === 'ringout') {
        bey.isActive = false
        bey.energy = 0
        bey.vx = 0
        bey.vy = 0
        return
      }

      if (bey.ringoutArmedTicks > 0) {
        bey.ringoutArmedTicks -= 1
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

        // 互いに離れる向きでも重なっている場合は最小ノックバックで押し返す
        const closingSpeed = Math.max(0, -velAlongNormal)
        const knockbackStrength = Math.max(
          MIN_COLLISION_KNOCKBACK,
          ((1 + COLLISION_RESTITUTION) * closingSpeed) / 2 * COLLISION_KNOCKBACK_BOOST,
        )

        a.vx -= knockbackStrength * nx
        a.vy -= knockbackStrength * ny
        b.vx += knockbackStrength * nx
        b.vy += knockbackStrength * ny

        b.vx += knockbackStrength * nx
        b.vy += knockbackStrength * ny

        const penetration = minDist - dist
        const correction = (Math.max(penetration - 0.1, 0) / 2) * 0.35
        a.x -= nx * correction
        a.y -= ny * correction
        b.x += nx * correction
        b.y += ny * correction

        const impact = knockbackStrength
  this.emitCollisionHaptic([a.playerId, b.playerId], 'bey')

        const aAttackX = Math.cos(a.attackAngle)
        const aAttackY = Math.sin(a.attackAngle)
        const bAttackX = Math.cos(b.attackAngle)
        const bAttackY = Math.sin(b.attackAngle)
        const aPointX = a.x + aAttackX * ATTACK_POINT_ORBIT_RADIUS
        const aPointY = a.y + aAttackY * ATTACK_POINT_ORBIT_RADIUS
        const bPointX = b.x + bAttackX * ATTACK_POINT_ORBIT_RADIUS
        const bPointY = b.y + bAttackY * ATTACK_POINT_ORBIT_RADIUS

        const aToBdx = b.x - aPointX
        const aToBdy = b.y - aPointY
        const bToAdx = a.x - bPointX
        const bToAdy = a.y - bPointY
        const aCriticalHit =
          aToBdx * aToBdx + aToBdy * aToBdy
          <= (b.radius + ATTACK_POINT_TARGET_PADDING) * (b.radius + ATTACK_POINT_TARGET_PADDING)
        const bCriticalHit =
          bToAdx * bToAdx + bToAdy * bToAdy
          <= (a.radius + ATTACK_POINT_TARGET_PADDING) * (a.radius + ATTACK_POINT_TARGET_PADDING)

        if (aCriticalHit) {
          const bonus = impact * (ATTACK_POINT_KNOCKBACK_MULTIPLIER - 1)
          b.vx += bonus * nx
          b.vy += bonus * ny
          a.vx -= bonus * ATTACK_POINT_SELF_RECOIL * nx
          a.vy -= bonus * ATTACK_POINT_SELF_RECOIL * ny
        }
        if (bCriticalHit) {
          const bonus = impact * (ATTACK_POINT_KNOCKBACK_MULTIPLIER - 1)
          a.vx -= bonus * nx
          a.vy -= bonus * ny
          b.vx += bonus * ATTACK_POINT_SELF_RECOIL * nx
          b.vy += bonus * ATTACK_POINT_SELF_RECOIL * ny
        }
        const aRingoutImpact = impact * (bCriticalHit ? ATTACK_POINT_KNOCKBACK_MULTIPLIER : 1)
        const bRingoutImpact = impact * (aCriticalHit ? ATTACK_POINT_KNOCKBACK_MULTIPLIER : 1)

        if (aRingoutImpact >= COLLISION_RINGOUT_IMPACT_THRESHOLD) {
          const ringoutArmTicks = Math.min(
            COLLISION_RINGOUT_MAX_TICKS,
            Math.max(COLLISION_RINGOUT_MIN_TICKS, Math.round(aRingoutImpact + 4)),
          )
          a.ringoutArmedTicks = Math.max(a.ringoutArmedTicks, ringoutArmTicks)
        }

        if (bRingoutImpact >= COLLISION_RINGOUT_IMPACT_THRESHOLD) {
          const ringoutArmTicks = Math.min(
            COLLISION_RINGOUT_MAX_TICKS,
            Math.max(COLLISION_RINGOUT_MIN_TICKS, Math.round(bRingoutImpact + 4)),
          )
          b.ringoutArmedTicks = Math.max(b.ringoutArmedTicks, ringoutArmTicks)
        }

        const aAdv = a.energy / Math.max(1, b.energy)
        const damageToA =
          (BASE_DAMAGE + (impact * IMPACT_MULTIPLIER) / Math.max(0.2, aAdv))
          * (bCriticalHit ? ATTACK_POINT_DAMAGE_MULTIPLIER : 1)
        const damageToB =
          (BASE_DAMAGE + impact * IMPACT_MULTIPLIER * Math.max(0.2, aAdv))
          * (aCriticalHit ? ATTACK_POINT_DAMAGE_MULTIPLIER : 1)

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

    if (total === 0) return

    // ソロプレイ: ベイが脱落したら勝敗なし（負け）で終了
    if (total === 1) {
      if (active.length === 0) {
        this.isGameActive = false
        this.status = 'ended'
        this.winnerId = undefined
      }
      return
    }

    // 2人以上: 残り1人以下で終了
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
      attackAngle: bey.attackAngle,
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

  private emitCollisionHaptic(playerIds: string[], kind: CollisionEventPayload['kind']) {
    if (!this.onCollision) {
      return
    }

    const now = this.game.loop.time || Date.now()
    const filtered = playerIds.filter((playerId) => {
      const lastAt = this.lastCollisionHapticAt.get(playerId) ?? 0
      if (now - lastAt < HAPTIC_COLLISION_COOLDOWN_MS) {
        return false
      }
      this.lastCollisionHapticAt.set(playerId, now)
      return true
    })

    if (filtered.length > 0) {
      this.onCollision({ playerIds: filtered, kind })
    }
  }

  private handleArenaBoundary(bey: RuntimeBey): 'none' | 'wall' | 'ringout' {
    const distSq = bey.x * bey.x + bey.y * bey.y
    const wallContactRadius = this.arenaRadius - bey.radius
    const wallContactSq = wallContactRadius * wallContactRadius

    if (distSq <= wallContactSq) {
      return 'none'
    }

    const dist = Math.sqrt(distSq)
    const nx = dist === 0 ? 1 : bey.x / dist
    const ny = dist === 0 ? 0 : bey.y / dist

    // 衝突直後のみ、壁を越えて押し出されたら場外負け
    if (bey.ringoutArmedTicks > 0 && dist > this.arenaRadius) {
      return 'ringout'
    }

    // 通常は壁で反射して場内へ戻す
    bey.x = nx * wallContactRadius
    bey.y = ny * wallContactRadius

    const outwardSpeed = bey.vx * nx + bey.vy * ny
    if (outwardSpeed > 0) {
      bey.vx -= (1 + WALL_RESTITUTION) * outwardSpeed * nx
      bey.vy -= (1 + WALL_RESTITUTION) * outwardSpeed * ny
    }

    return 'wall'
  }

  private projectX(x: number) {
    const centerX = this.scale.width / 2
    return centerX + x * this.unitToPixel
  }

  private projectY(y: number) {
    const centerY = this.scale.height / 2
    return centerY + y * this.unitToPixel
  }
}

export default GameScene
