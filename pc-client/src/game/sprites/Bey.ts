import Phaser from 'phaser'
import type { Bey as BeyState } from '../../types'

class BeySprite {
  private readonly root: Phaser.GameObjects.Container
  private readonly body: Phaser.GameObjects.Arc
  private readonly core: Phaser.GameObjects.Arc
  private readonly ring: Phaser.GameObjects.Arc
  private readonly highlight: Phaser.GameObjects.Rectangle
  private readonly nameLabel: Phaser.GameObjects.Text
  private spinVelocity = 4

  constructor(scene: Phaser.Scene, id: string, playerName: string) {
    const palette = this.pickColor(id)

    this.body = scene.add.circle(0, 0, 30, palette.outer, 1)
    this.body.setStrokeStyle(6, 0xffffff, 0.9)

    this.ring = scene.add.circle(0, 0, 20, palette.inner, 1)
    this.ring.setStrokeStyle(3, 0xffffff, 0.4)

    this.core = scene.add.circle(0, 0, 8, 0xf8fafc, 1)
    this.highlight = scene.add.rectangle(-8, -10, 12, 4, 0xffffff, 0.55)
    this.highlight.setAngle(-24)

    this.nameLabel = scene.add.text(0, -54, playerName, {
      fontFamily: 'Segoe UI',
      fontSize: '14px',
      color: '#e2e8f0',
      fontStyle: 'bold',
      align: 'center',
    })
    this.nameLabel.setOrigin(0.5)

    this.root = scene.add.container(0, 0, [
      this.body,
      this.ring,
      this.core,
      this.highlight,
      this.nameLabel,
    ])
    this.root.setDepth(10)
  }

  applyState(x: number, y: number, state: BeyState) {
    this.root.setPosition(x, y)
    this.root.setRotation(Phaser.Math.DegToRad(state.rotation ?? 0))

    const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy)
    this.spinVelocity = Math.max(1.5, speed * 0.9)

    this.root.setAlpha(state.energy > 0 ? 1 : 0.35)
  }

  tick() {
    this.ring.rotation += 0.05 * this.spinVelocity
    this.highlight.rotation += 0.02 * this.spinVelocity
  }

  destroy() {
    this.root.destroy(true)
  }

  private pickColor(id: string) {
    const palettes = [
      { outer: 0x22d3ee, inner: 0x0f766e },
      { outer: 0xf97316, inner: 0xc2410c },
      { outer: 0xa3e635, inner: 0x4d7c0f },
      { outer: 0xf43f5e, inner: 0x9f1239 },
    ]

    const sum = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return palettes[sum % palettes.length]
  }
}

export default BeySprite
