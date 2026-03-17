import Phaser from 'phaser'
import type { Bey as BeyState } from '../../types'

class BeySprite {
  private readonly root: Phaser.GameObjects.Container
  private readonly body: Phaser.GameObjects.Arc
  private readonly core: Phaser.GameObjects.Arc
  private readonly ring: Phaser.GameObjects.Arc
  private readonly attackPoint: Phaser.GameObjects.Arc
  private readonly nameLabel: Phaser.GameObjects.Text
  private spinVelocity = 4

  constructor(scene: Phaser.Scene, id: string, playerName: string, pixelScale: number, beyType: BeyState['beyType']) {
    const palette = this.pickColor(id, beyType)

    // BEY_RADIUS = 72 に合わせる
    this.body = scene.add.circle(0, 0, 72 * pixelScale, palette.outer, 1)
    this.body.setStrokeStyle(6 * pixelScale, 0xffffff, 0.9)

    this.ring = scene.add.circle(0, 0, 48 * pixelScale, palette.inner, 1)
    this.ring.setStrokeStyle(3 * pixelScale, 0xffffff, 0.4)

    this.core = scene.add.circle(0, 0, 18 * pixelScale, 0xf8fafc, 1)
    this.attackPoint = scene.add.circle(0, -54 * pixelScale, 12 * pixelScale, 0xef4444, 1)
    this.attackPoint.setStrokeStyle(4 * pixelScale, 0xfef2f2, 0.9)

    this.nameLabel = scene.add.text(0, -120 * pixelScale, playerName, {
      fontFamily: 'Segoe UI',
      fontSize: `${Math.round(28 * pixelScale)}px`,
      color: '#e2e8f0',
      fontStyle: 'bold',
      align: 'center',
    })
    this.nameLabel.setOrigin(0.5)

    this.root = scene.add.container(0, 0, [
      this.body,
      this.ring,
      this.core,
      this.attackPoint,
      this.nameLabel,
    ])
    this.root.setDepth(10)
  }

  applyState(x: number, y: number, state: BeyState, pixelScale: number) {
    this.root.setPosition(x, y)

    const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy)
    this.spinVelocity = Math.max(1.5, speed * 0.9)
    const attackAngle = state.attackAngle ?? 0
    const orbitRadius = 54 * pixelScale // ATTACK_POINT_ORBIT_RADIUS = 54
    this.attackPoint.setPosition(
      Math.cos(attackAngle) * orbitRadius,
      Math.sin(attackAngle) * orbitRadius,
    )

    this.root.setAlpha(state.energy > 0 ? 1 : 0.35)
  }

  tick() {
    this.ring.rotation += 0.05 * this.spinVelocity
  }

  destroy() {
    this.root.destroy(true)
  }

  private pickColor(id: string, beyType: BeyState['beyType']) {
    // 1. 内側の色：個人を識別するランダムな色
    const innerPalettes = [
      0x0f766e, // Teal
      0x1d4ed8, // Blue
      0xc2410c, // Orange
      0x4d7c0f, // Green
      0x9f1239, // Rose
      0x7e22ce, // Purple
      0x0369a1, // Sky
      0xbe185d, // Pink
    ]

    // 2. 外側の色：タイプに基づいた系統色
    const typeOuterPalettes: Record<string, number[]> = {
      balance: [0xfacc15, 0xeab308, 0xfde047, 0xf59e0b], // 黄色・アンバー系
      power:   [0xef4444, 0xf97316, 0xd97706, 0xdc2626], // 赤・オレンジ系
      defense: [0x0ea5e9, 0x2563eb, 0x0284c7, 0x3b82f6], // 青・シアン系
      weight:  [0x22c55e, 0x84cc16, 0x10b981, 0x059669], // 緑・ライム系
    }

    const sum = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0)
    
    // 内側の決定
    const inner = innerPalettes[sum % innerPalettes.length]
    
    // 外側の決定
    const outerList = typeOuterPalettes[beyType || 'balance'] || typeOuterPalettes.balance
    const outer = outerList[sum % outerList.length]

    return { outer, inner }
  }
}

export default BeySprite
