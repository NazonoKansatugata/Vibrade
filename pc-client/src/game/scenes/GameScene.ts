import Phaser from 'phaser'
import BeySprite from '../sprites/Bey'
import type { GameState } from '../../types'
import type { GameStartPayload, PlayerInputPayload, LaunchBeyPayload } from '../../hooks/useGameSocket'

const TICK_MS = 33
const FRICTION = 0.98
const ENERGY_DECAY = 0.05
const BASE_ACCEL = 0.9
const BOOST_FORCE = 14.0
const TILT_SMOOTHING = 0.28
const WEAK_TILT_THRESHOLD = 0.18
const CENTER_PULL_FORCE = 0.28
const SPECIAL_ATTACK_MIN_ACTIVATION_SPEED = 7.5
const SPECIAL_ATTACK_WINDOW_TICKS = 18
const SPECIAL_ATTACK_BASE_BONUS_DAMAGE = 6.5
const SPECIAL_ATTACK_MAX_BONUS_DAMAGE = 13
const COLLISION_RESTITUTION = 0.82
const COLLISION_KNOCKBACK_BOOST = 1.45
const MIN_COLLISION_KNOCKBACK = 2.0
const WALL_RESTITUTION = 0.86
const OUTWARD_RISK_NORMALIZE_SPEED = 11.0
const RINGOUT_RISK_DECAY = 0.04
const COLLISION_RINGOUT_RISK_GAIN = 0.24
const OUTWARD_RINGOUT_RISK_GAIN = 0.18
const RINGOUT_RISK_TRIGGER = 0.56
const RINGOUT_MIN_OUTWARD_SPEED = 1.8
const RINGOUT_SPEED_NORMALIZE = 6.5
const RINGOUT_LOW_SPEED_TRIGGER_BONUS = 0.2
const BASE_DAMAGE = 4
const IMPACT_MULTIPLIER = 0.8
const BASE_ENERGY = 300
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

type BeyTypeKey = NonNullable<GameState['players'][number]['beyType']>

interface TypeTuning {
  launchForceMultiplier: number
  controlAssistMultiplier: number
  maxEnergyMultiplier: number
  energyDecayMultiplier: number
  damageDealtMultiplier: number
  damageTakenMultiplier: number
  knockbackPowerMultiplier: number
  knockbackResistMultiplier: number
  ringoutRiskGainMultiplier: number
  ringoutRiskDecayMultiplier: number
  ringoutRiskTriggerMultiplier: number
  wallRiskRecoveryBonus: number
}

const TYPE_TUNING: Record<BeyTypeKey, TypeTuning> = {
  balance: {
    launchForceMultiplier: 1,
    controlAssistMultiplier: 1.1,
    maxEnergyMultiplier: 1,
    energyDecayMultiplier: 1,
    damageDealtMultiplier: 1,
    damageTakenMultiplier: 1,
    knockbackPowerMultiplier: 1,
    knockbackResistMultiplier: 1,
    ringoutRiskGainMultiplier: 1,
    ringoutRiskDecayMultiplier: 1,
    ringoutRiskTriggerMultiplier: 1,
    wallRiskRecoveryBonus: 1,
  },
  power: {
    launchForceMultiplier: 1.12,
    controlAssistMultiplier: 1.2,
    maxEnergyMultiplier: 0.95,
    energyDecayMultiplier: 1.1,
    damageDealtMultiplier: 1,
    damageTakenMultiplier: 1.06,
    knockbackPowerMultiplier: 1.15,
    knockbackResistMultiplier: 0.92,
    ringoutRiskGainMultiplier: 1.18,
    ringoutRiskDecayMultiplier: 0.9,
    ringoutRiskTriggerMultiplier: 0.95,
    wallRiskRecoveryBonus: 0.9,
  },
  defense: {
    launchForceMultiplier: 0.9,
    controlAssistMultiplier: 0.92,
    maxEnergyMultiplier: 1.06,
    energyDecayMultiplier: 0.96,
    damageDealtMultiplier: 0.9,
    damageTakenMultiplier: 0.82,
    knockbackPowerMultiplier: 0.92,
    knockbackResistMultiplier: 1.3,
    ringoutRiskGainMultiplier: 0.75,
    ringoutRiskDecayMultiplier: 1.18,
    ringoutRiskTriggerMultiplier: 1.18,
    wallRiskRecoveryBonus: 1.2,
  },
  weight: {
    launchForceMultiplier: 0.88,
    controlAssistMultiplier: 1.5,
    maxEnergyMultiplier: 1.2,
    energyDecayMultiplier: 0.78,
    damageDealtMultiplier: 0.88,
    damageTakenMultiplier: 0.93,
    knockbackPowerMultiplier: 0.9,
    knockbackResistMultiplier: 1.08,
    ringoutRiskGainMultiplier: 0.82,
    ringoutRiskDecayMultiplier: 1.25,
    ringoutRiskTriggerMultiplier: 1.1,
    wallRiskRecoveryBonus: 1.1,
  },
}

export interface CollisionEventPayload {
  playerIds: string[]
  kind: 'bey' | 'wall' | 'special'
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
  ringoutRisk: number
  smoothedTiltX: number
  smoothedTiltY: number
  specialAttackTicks: number
  specialAttackBonusDamage: number
  attackAngle: number
  attackSpinRate: number
  launchTime?: number
  beyType: GameState['players'][0]['beyType']
}

class GameScene extends Phaser.Scene {
  private readonly roomId: string
  private readonly onStateChange?: (gameState: GameState) => void
  private readonly onCollision?: (payload: CollisionEventPayload) => void
  private arenaRadius: number = 500
  private unitToPixel: number = 1
  private arena?: Phaser.GameObjects.Arc
  private arenaRing?: Phaser.GameObjects.Arc
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
  private countdownBg?: Phaser.GameObjects.Graphics
  private countdownBox?: Phaser.GameObjects.Graphics
  private countdownText?: Phaser.GameObjects.Text
  private shootStartTime: number = 0
  private countdownState: '3' | '2' | '1' | 'GO' | 'SHOOT' | 'NONE' = 'NONE'
  private lastCountdownUpdateAt: number = 0
  private lastCollisionHapticAt = new Map<string, number>()
  private specialAttackFlashTicks: number = 0

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
    this.buildScene(this.game.canvas.width, this.game.canvas.height)

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

    if (this.specialAttackFlashTicks > 0) {
      this.specialAttackFlashTicks--
      // 1秒間に15回色を変える (1000ms / 15 = 約66.6ms ごとに更新)
      const step = Math.floor(this.game.loop.time / (1000 / 15))
      const hue = (step * 0.23) % 1 // 各ステップで大きく色を変える
      const color = Phaser.Display.Color.HSLToColor(hue, 1, 0.5)
      this.cameras.main.setBackgroundColor(color.color)
      
      if (this.specialAttackFlashTicks === 0) {
        this.cameras.main.setBackgroundColor('#0f172a')
      }
    }

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

    // 前のカウントのアニメーションを即座に停止し、状態をリセット
    this.tweens.killTweensOf(this.countdownText)
    if (this.countdownBg) {
      this.tweens.killTweensOf(this.countdownBg)
      this.countdownBg.setAlpha(0)
      this.countdownBg.setVisible(false)
    }
    if (this.countdownBox) {
      this.tweens.killTweensOf(this.countdownBox)
      this.countdownBox.setAlpha(0)
      this.countdownBox.setVisible(false)
    }

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
    this.countdownText.setScale(0.8) // 最初は少し小さめ
    this.countdownText.setVisible(true)

    const width = this.scale.width
    const height = this.scale.height
    const centerX = width / 2
    const centerY = height / 2

    const isThree = state === '3'

    if (this.countdownBg) {
      this.countdownBg.clear()
      if (!isThree) {
        // 斜め分割背景 (赤と濃紺)
        const splitX = centerX + 100
        this.countdownBg.fillStyle(0x991b1b, 0.85) // Red
        this.countdownBg.beginPath()
        this.countdownBg.moveTo(0, 0)
        this.countdownBg.lineTo(splitX + 150, 0)
        this.countdownBg.lineTo(splitX - 150, height)
        this.countdownBg.lineTo(0, height)
        this.countdownBg.closePath()
        this.countdownBg.fillPath()

        this.countdownBg.fillStyle(0x1e293b, 0.85) // Dark Grey
        this.countdownBg.beginPath()
        this.countdownBg.moveTo(splitX + 150, 0)
        this.countdownBg.lineTo(width, 0)
        this.countdownBg.lineTo(width, height)
        this.countdownBg.lineTo(splitX - 150, height)
        this.countdownBg.closePath()
        this.countdownBg.fillPath()
        
        this.countdownBg.setVisible(true)
      }
    }

    // ボックス演出の描画
    if (this.countdownBox) {
      this.countdownBox.clear()
      if (!isThree) {
        const boxW = 800
        const boxH = 180
        this.countdownBox.fillStyle(0x0a0a0a, 0.9)
        this.countdownBox.fillRect(centerX - boxW / 2, centerY - boxH / 2, boxW, boxH)
        this.countdownBox.lineStyle(4, 0xffffff, 0.8)
        // 角のアクセント
        const d = 20
        this.countdownBox.strokeLineShape(new Phaser.Geom.Line(centerX - boxW / 2, centerY - boxH / 2 + d, centerX - boxW / 2, centerY - boxH / 2))
        this.countdownBox.strokeLineShape(new Phaser.Geom.Line(centerX - boxW / 2, centerY - boxH / 2, centerX - boxW / 2 + d, centerY - boxH / 2))
        this.countdownBox.strokeLineShape(new Phaser.Geom.Line(centerX + boxW / 2 - d, centerY - boxH / 2, centerX + boxW / 2, centerY - boxH / 2))
        this.countdownBox.strokeLineShape(new Phaser.Geom.Line(centerX + boxW / 2, centerY - boxH / 2, centerX + boxW / 2, centerY - boxH / 2 + d))
        this.countdownBox.strokeLineShape(new Phaser.Geom.Line(centerX + boxW / 2, centerY + boxH / 2 - d, centerX + boxW / 2, centerY + boxH / 2))
        this.countdownBox.strokeLineShape(new Phaser.Geom.Line(centerX + boxW / 2, centerY + boxH / 2, centerX + boxW / 2 - d, centerY + boxH / 2))
        this.countdownBox.strokeLineShape(new Phaser.Geom.Line(centerX - boxW / 2 + d, centerY + boxH / 2, centerX - boxW / 2, centerY + boxH / 2))
        this.countdownBox.strokeLineShape(new Phaser.Geom.Line(centerX - boxW / 2, centerY + boxH / 2, centerX - boxW / 2, centerY + boxH / 2 - d))
        
        this.countdownBox.setVisible(true)
      }
    }

    const isShoot = state === 'SHOOT'
    this.countdownText.setPosition(centerX - 1000, centerY)
    this.countdownText.setAlpha(0)

    // アニメーションシーケンス
    this.tweens.add({
      targets: [this.countdownBg, this.countdownBox],
      alpha: 1,
      duration: 200
    })

    this.tweens.add({
      targets: this.countdownText,
      x: centerX,
      alpha: 1,
      scale: scale,
      duration: 300,
      ease: 'Back.out',
      onComplete: () => {
        if (isShoot) {
          this.tweens.add({
            targets: this.countdownText,
            scale: scale * 1.05,
            duration: 400,
            yoyo: true,
            repeat: -1
          })
          return
        }

        this.tweens.add({
          targets: this.countdownText,
          x: centerX + 50,
          duration: 400,
          onComplete: () => {
            this.tweens.add({
              targets: [this.countdownText, this.countdownBox, this.countdownBg],
              x: { value: '+=1000', targets: this.countdownText },
              alpha: 0,
              duration: 250,
              ease: 'Cubic.in'
            })
          }
        })
      }
    })
  }

  private finalizeLaunch() {
    this.status = 'playing'
    this.countdownState = 'NONE'
    if (this.countdownText) {
      this.tweens.killTweensOf(this.countdownText)
      if (this.countdownBg) this.tweens.killTweensOf(this.countdownBg)
      if (this.countdownBox) this.tweens.killTweensOf(this.countdownBox)
      
      // 全体をフェードアウトしながら抜ける
      this.tweens.add({
        targets: [this.countdownText, this.countdownBox, this.countdownBg],
        alpha: 0,
        x: { value: '+=800', targets: this.countdownText }, // テキストだけ少し動かす
        duration: 400,
        ease: 'Cubic.in',
        onComplete: () => {
          this.countdownText?.setText('')
          this.countdownText?.setAlpha(1)
          this.countdownText?.setScale(1)
          this.countdownText?.setPosition(this.scale.width / 2, this.scale.height / 2)
          this.countdownText?.setVisible(false)
          this.countdownBg?.setVisible(false)
          this.countdownBox?.setVisible(false)
        }
      })
    }

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

        const typeTuning = this.getTypeTuning(bey.beyType)
        const baseEnergy = BASE_ENERGY * typeTuning.maxEnergyMultiplier
        bey.energy = baseEnergy * energyFactor
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
        ringoutRisk: 0,
        smoothedTiltX: 0,
        smoothedTiltY: 0,
        specialAttackTicks: 0,
        specialAttackBonusDamage: 0,
        attackAngle: ((index * Math.PI) / 2) % (Math.PI * 2),
        attackSpinRate: 0.18 + (index % 3) * 0.03,
        launchTime: undefined,
        beyType: player.beyType ?? 'balance',
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
    const normalizedPower = Phaser.Math.Clamp(payload.power, 0, 1)
    const typeTuning = this.getTypeTuning(bey.beyType)
    const force = BOOST_FORCE * (0.45 + normalizedPower * 1.55) * typeTuning.launchForceMultiplier
    const speedBeforeLaunch = Math.sqrt(bey.vx * bey.vx + bey.vy * bey.vy)
    
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

    if (speedBeforeLaunch >= SPECIAL_ATTACK_MIN_ACTIVATION_SPEED) {
      const speedScale = Phaser.Math.Clamp(speedBeforeLaunch / 16, 0.45, 1)
      const bonusDamage = Phaser.Math.Linear(
        SPECIAL_ATTACK_BASE_BONUS_DAMAGE,
        SPECIAL_ATTACK_MAX_BONUS_DAMAGE,
        Phaser.Math.Clamp((normalizedPower + speedScale) / 2, 0, 1),
      )
      bey.specialAttackTicks = Math.max(bey.specialAttackTicks, SPECIAL_ATTACK_WINDOW_TICKS)
      bey.specialAttackBonusDamage = Math.max(bey.specialAttackBonusDamage, bonusDamage)
      this.triggerSpecialAttack()
    }

    // 最大速度制限は simulateTick で行われるが、瞬間的に超えるのは許容（あるいはここで軽くキャップ）
  }

  private buildScene(width: number, height: number) {
    this.arena?.destroy()
    this.arenaRing?.destroy()
    this.countdownBg?.destroy()
    this.countdownBox?.destroy()
    this.countdownText?.destroy()

    const centerX = width / 2
    const centerY = height / 2
    
    // 基準となる4人時(半径500)のピクセル半径を計算
    const baseArenaPixelRadius = Math.min(width, height) * ARENA_RENDER_RADIUS_SCALE
    this.unitToPixel = baseArenaPixelRadius / 500
    
    // 現在の人数に応じた描画半径
    const currentArenaPixelRadius = this.arenaRadius * this.unitToPixel

    this.arena = this.add.circle(centerX, centerY, currentArenaPixelRadius, 0x132238, 0.95)
    this.arena.setStrokeStyle(8, 0x38bdf8, 0.35)

    // --- カウントダウン演出用アセット ---
    this.countdownBg = this.add.graphics()
    this.countdownBg.setDepth(90)
    this.countdownBg.setVisible(false)

    this.countdownBox = this.add.graphics()
    this.countdownBox.setDepth(95)
    this.countdownBox.setVisible(false)

    this.countdownText = this.add.text(centerX, centerY, '', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '110px',
      color: '#ffffff',
      fontStyle: 'bold italic',
      stroke: '#000000',
      strokeThickness: 12,
      padding: { left: 20, right: 40, top: 10, bottom: 10 },
    })
    this.countdownText.setOrigin(0.5)
    this.countdownText.setVisible(false)
    this.countdownText.setDepth(100)
  }

  public triggerSpecialAttack() {
    this.specialAttackFlashTicks = 30 // Approx 1 second at 33ms/tick
  }

  private renderGameState() {
    const gameState = this.buildGameState()

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
        sprite = new BeySprite(this, beyState.id, playerName ?? `P${index + 1}`, this.unitToPixel, beyState.beyType || 'balance')
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
      const tiltMagnitude = Math.sqrt(tiltX * tiltX + tiltY * tiltY)
      const typeTuning = this.getTypeTuning(bey.beyType)

      bey.smoothedTiltX += (tiltX - bey.smoothedTiltX) * TILT_SMOOTHING
      bey.smoothedTiltY += (tiltY - bey.smoothedTiltY) * TILT_SMOOTHING

      const speedBeforeInput = Math.sqrt(bey.vx * bey.vx + bey.vy * bey.vy)
      const controlFactor = Math.max(0.3, 1 - bey.energy / 200)
      const steeringAssist = Phaser.Math.Clamp(0.45 + speedBeforeInput / 14, 0.45, 1)
      bey.vx += bey.smoothedTiltX * BASE_ACCEL * controlFactor * steeringAssist * typeTuning.controlAssistMultiplier
      bey.vy += bey.smoothedTiltY * BASE_ACCEL * controlFactor * steeringAssist * typeTuning.controlAssistMultiplier

      const weakTiltFactor = Phaser.Math.Clamp((WEAK_TILT_THRESHOLD - tiltMagnitude) / WEAK_TILT_THRESHOLD, 0, 1)
      if (weakTiltFactor > 0) {
        const distToCenter = Math.sqrt(bey.x * bey.x + bey.y * bey.y)
        if (distToCenter > 1) {
          const toCenterX = -bey.x / distToCenter
          const toCenterY = -bey.y / distToCenter
          const centerBias = 0.55 + Math.min(1.25, distToCenter / Math.max(1, this.arenaRadius))
          const centerPull = CENTER_PULL_FORCE * weakTiltFactor * centerBias
          bey.vx += toCenterX * centerPull
          bey.vy += toCenterY * centerPull
        }
      }

      const speed = Math.sqrt(bey.vx * bey.vx + bey.vy * bey.vy)
      bey.attackAngle = (bey.attackAngle + bey.attackSpinRate * (0.8 + speed / 20)) % (Math.PI * 2)

      bey.x += bey.vx
      bey.y += bey.vy
      bey.vx *= FRICTION
      bey.vy *= FRICTION
      bey.ringoutRisk = Math.max(0, bey.ringoutRisk - RINGOUT_RISK_DECAY * typeTuning.ringoutRiskDecayMultiplier)
      if (bey.specialAttackTicks > 0) {
        bey.specialAttackTicks -= 1
      } else {
        bey.specialAttackBonusDamage = 0
      }

      bey.energy = Math.max(0, bey.energy - ENERGY_DECAY * typeTuning.energyDecayMultiplier)

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

        const aType = this.getTypeTuning(a.beyType)
        const bType = this.getTypeTuning(b.beyType)
        const knockbackToA = knockbackStrength * bType.knockbackPowerMultiplier / aType.knockbackResistMultiplier
        const knockbackToB = knockbackStrength * aType.knockbackPowerMultiplier / bType.knockbackResistMultiplier

        a.vx -= knockbackToA * nx
        a.vy -= knockbackToA * ny
        b.vx += knockbackToB * nx
        b.vy += knockbackToB * ny

        const penetration = minDist - dist
        const correction = (Math.max(penetration - 0.1, 0) / 2) * 0.35
        a.x -= nx * correction
        a.y -= ny * correction
        b.x += nx * correction
        b.y += ny * correction

        const impact = knockbackStrength

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
            * aType.knockbackPowerMultiplier / bType.knockbackResistMultiplier
          b.vx += bonus * nx
          b.vy += bonus * ny
          a.vx -= bonus * ATTACK_POINT_SELF_RECOIL * nx
          a.vy -= bonus * ATTACK_POINT_SELF_RECOIL * ny
        }
        if (bCriticalHit) {
          const bonus = impact * (ATTACK_POINT_KNOCKBACK_MULTIPLIER - 1)
            * bType.knockbackPowerMultiplier / aType.knockbackResistMultiplier
          a.vx -= bonus * nx
          a.vy -= bonus * ny
          b.vx += bonus * ATTACK_POINT_SELF_RECOIL * nx
          b.vy += bonus * ATTACK_POINT_SELF_RECOIL * ny
        }

        const impactNorm = Phaser.Math.Clamp((impact - MIN_COLLISION_KNOCKBACK) / 10, 0, 1)
        const aDist = Math.max(1, Math.sqrt(a.x * a.x + a.y * a.y))
        const bDist = Math.max(1, Math.sqrt(b.x * b.x + b.y * b.y))
        const aOutwardSpeed = Math.max(0, (a.vx * a.x + a.vy * a.y) / aDist)
        const bOutwardSpeed = Math.max(0, (b.vx * b.x + b.vy * b.y) / bDist)
        const aOutwardNorm = Phaser.Math.Clamp(aOutwardSpeed / OUTWARD_RISK_NORMALIZE_SPEED, 0, 1)
        const bOutwardNorm = Phaser.Math.Clamp(bOutwardSpeed / OUTWARD_RISK_NORMALIZE_SPEED, 0, 1)

        const aRiskGain =
          (impactNorm * COLLISION_RINGOUT_RISK_GAIN
          + aOutwardNorm * OUTWARD_RINGOUT_RISK_GAIN
          + (bCriticalHit ? 0.08 : 0)
          ) * aType.ringoutRiskGainMultiplier
        const bRiskGain =
          (impactNorm * COLLISION_RINGOUT_RISK_GAIN
          + bOutwardNorm * OUTWARD_RINGOUT_RISK_GAIN
          + (aCriticalHit ? 0.08 : 0)
          ) * bType.ringoutRiskGainMultiplier

        a.ringoutRisk = Phaser.Math.Clamp(a.ringoutRisk + aRiskGain, 0, 1)
        b.ringoutRisk = Phaser.Math.Clamp(b.ringoutRisk + bRiskGain, 0, 1)

        const aForwardSpeed = Math.max(0, a.vx * nx + a.vy * ny)
        const bForwardSpeed = Math.max(0, -(b.vx * nx + b.vy * ny))
        const totalForwardSpeed = Math.max(0.2, aForwardSpeed + bForwardSpeed)
        const aForwardShare = aForwardSpeed / totalForwardSpeed
        const bForwardShare = bForwardSpeed / totalForwardSpeed
        const baseImpactDamage = BASE_DAMAGE + impact * IMPACT_MULTIPLIER

        const aSpecialBonus =
          a.specialAttackTicks > 0
            ? a.specialAttackBonusDamage * (0.35 + aForwardShare * 0.65)
            : 0
        const bSpecialBonus =
          b.specialAttackTicks > 0
            ? b.specialAttackBonusDamage * (0.35 + bForwardShare * 0.65)
            : 0

        const damageToA =
          baseImpactDamage
          * (0.3 + 1.15 * (bForwardSpeed / totalForwardSpeed))
          * bType.damageDealtMultiplier
          * aType.damageTakenMultiplier
          * (bCriticalHit ? ATTACK_POINT_DAMAGE_MULTIPLIER : 1)
          + bSpecialBonus
        const damageToB =
          baseImpactDamage
          * (0.3 + 1.15 * (aForwardSpeed / totalForwardSpeed))
          * aType.damageDealtMultiplier
          * bType.damageTakenMultiplier
          * (aCriticalHit ? ATTACK_POINT_DAMAGE_MULTIPLIER : 1)
          + aSpecialBonus

        const hasSpecialHit = aSpecialBonus > 0 || bSpecialBonus > 0
        this.emitCollisionHaptic([a.playerId, b.playerId], hasSpecialHit ? 'special' : 'bey')

        if (aSpecialBonus > 0) {
          a.specialAttackTicks = 0
          a.specialAttackBonusDamage = 0
        }
        if (bSpecialBonus > 0) {
          b.specialAttackTicks = 0
          b.specialAttackBonusDamage = 0
        }

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
      beyType: bey.beyType,
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
    const outwardSpeed = bey.vx * nx + bey.vy * ny
    const typeTuning = this.getTypeTuning(bey.beyType)
    const baseRingoutRiskTrigger = RINGOUT_RISK_TRIGGER * typeTuning.ringoutRiskTriggerMultiplier

    // 低速では絶対に場外にしない（速度ゲート）
    if (outwardSpeed >= RINGOUT_MIN_OUTWARD_SPEED) {
      const speedNorm = Phaser.Math.Clamp(
        (outwardSpeed - RINGOUT_MIN_OUTWARD_SPEED)
          / Math.max(0.1, RINGOUT_SPEED_NORMALIZE - RINGOUT_MIN_OUTWARD_SPEED),
        0,
        1,
      )
      const ringoutRiskTriggerEffective = baseRingoutRiskTrigger + RINGOUT_LOW_SPEED_TRIGGER_BONUS * (1 - speedNorm)

      // 高速ほど要求リスクを下げ、低速ほど要求リスクを上げる
      if (bey.ringoutRisk >= ringoutRiskTriggerEffective) {
        return 'ringout'
      }
    }

    // 通常は壁で反射して場内へ戻す
    bey.x = nx * wallContactRadius
    bey.y = ny * wallContactRadius

    if (outwardSpeed > 0) {
      bey.vx -= (1 + WALL_RESTITUTION) * outwardSpeed * nx
      bey.vy -= (1 + WALL_RESTITUTION) * outwardSpeed * ny
    }

    // 壁反射で踏みとどまった時は、場外リスクを少しだけ下げる
    bey.ringoutRisk = Math.max(0, bey.ringoutRisk - 0.06 * typeTuning.wallRiskRecoveryBonus)

    return 'wall'
  }

  private getTypeTuning(beyType?: GameState['players'][number]['beyType']): TypeTuning {
    const key = (beyType ?? 'balance') as BeyTypeKey
    return TYPE_TUNING[key] ?? TYPE_TUNING.balance
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
